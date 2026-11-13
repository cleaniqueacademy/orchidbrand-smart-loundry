# Laundry Cleanique — Implementation Tickets

**Status:** Draft siap dikerjakan, menunggu pemecahan ke issue tracker jika digunakan  
**Scope:** Rilis Coming Soon dan integrasi Midtrans untuk langganan SaaS  
**Tanggal keputusan:** 12 November 2026

## Status implementasi — 13 November 2026

- CC-01 sampai CC-04: implementasi branch Coming Soon tersedia. Pengujian PostgreSQL terisolasi mencakup kuota bersamaan, pemilihan cabang, snapshot harga, dan aktivasi invoice idempotent.
- PUB-01: validasi secret production, origin HTTPS, dan header keamanan diterapkan. Audit dependency tidak lagi menemukan high/critical; advisory moderate dan penilaiannya ada di `DEPENDENCY_AUDIT.md`.
- PUB-02: image backend/frontend berhasil dibangun dan dijalankan bersama pada Docker lokal; health upstream dan frontend HTTP 200. Dump PostgreSQL berhasil dipulihkan ke database staging lokal. Backup SSH eksternal, TLS domain dan smoke test VPS masih memerlukan lingkungan deployment.
- PUB-03: workflow CI dan runbook tersedia. Build frontend dan typecheck backend lulus; 50 test terpilih lulus. Workflow remote, cetak pada printer fisik, dan latihan restore VPS belum dijalankan.
- MID-01 sampai MID-04: menunggu snapshot branch Coming Soon, kemudian dikerjakan pada branch turunan.

## Keputusan dan ruang lingkup

- Paket Premium adalah langganan tingkat Owner yang berlaku untuk semua cabang milik Owner, maksimal **5 cabang termasuk cabang utama**.
- Harga normal Premium adalah **Rp200.000 per bulan**. Promo aktif memberikan potongan Rp50.000 sehingga menjadi Rp150.000 sebelum diskon referral.
- Promo dan satu kode referral yang valid **dapat ditumpuk**. Promo diterapkan terlebih dahulu; referral dihitung dari harga setelah promo.
- Printer memakai dialog cetak browser dan printer yang telah disiapkan di sistem operasi. Aplikasi tidak menjanjikan koneksi langsung Bluetooth/USB.
- Rilis awal menggunakan **satu VPS** dengan backup dan pemulihan. Ini bukan deployment HA.
- Cakupan stok bahan baku dikeluarkan. Arus kas yang sudah ada tetap dipakai.
- Midtrans hanya untuk pembayaran langganan SaaS, bukan pembayaran order laundry pelanggan.
- Harga dihitung dan diverifikasi di backend. Nilai di browser tidak menjadi sumber kebenaran transaksi.

## Branch dan milestone

```text
main
└── feature/coming-soon
    ├── CC-01 … CC-04
    └── PUB-01 … PUB-03  → validasi dan rilis awal
        └── feature/coming-soon-midtrans
            └── MID-01 … MID-04
```

Selesaikan dan validasi seluruh ticket branch pertama sebelum membuat branch Midtrans dari hasilnya. Branch Midtrans mewarisi perubahan Coming Soon; jangan mengimplementasikan ulang ticket bersama.

## Ringkasan jumlah

| Milestone | Ticket | Jumlah |
|---|---|---:|
| Coming Soon — fitur Premium | CC-01 sampai CC-04 | 4 |
| Rilis awal satu VPS | PUB-01 sampai PUB-03 | 3 |
| Midtrans langganan SaaS | MID-01 sampai MID-04 | 4 |
| **Rilis awal tanpa Midtrans** | CC + PUB | **7** |
| **Rilis setelah Midtrans** | CC + PUB + MID | **11** |

---

## Branch 1 — Coming Soon dan rilis awal

### CC-01 — Paket Premium, entitlement Owner, dan kalkulasi harga

**Prioritas:** P0 · **Depends on:** —

Tetapkan satu sumber entitlement untuk Owner dan semua cabangnya. Hentikan aturan tier yang bertentangan antara data `users`, `tenants`, registri frontend, dan `plans`. Migrasikan alur tagihan yang saat ini berjangkar ke satu tenant agar satu invoice memperpanjang langganan Owner dan mencakup seluruh cabang miliknya; pertahankan riwayat invoice lama.

**Logika harga bulanan**

```text
harga_normal       = Rp200.000
potongan_promo     = Rp50.000, jika promo aktif saat invoice dibuat
subtotal           = max(0, harga_normal - potongan_promo)
potongan_referral  = diskon referral valid yang dihitung atas subtotal
harga_akhir        = max(0, subtotal - potongan_referral)
total_invoice      = harga_akhir × jumlah_bulan
```

- Untuk referral persentase, hitung persentase atas subtotal setelah promo.
- Untuk referral nominal tetap, terapkan aturan nominal referral yang sudah berlaku saat ini per bulan, batasi agar tidak melebihi subtotal, lalu kalikan jumlah bulan.
- Batasi satu kode referral per invoice. Kode yang dimasukkan Owner mengikuti validasi referral yang ada; jangan menambahkan referral otomatis kedua.
- Promo harus memiliki status aktif dan jendela waktu yang dapat dikonfigurasi. Promo dinilai saat invoice dibuat; nilai dan rincian diskon yang tersimpan di invoice tidak berubah setelah itu.
- Seluruh nilai uang berupa Rupiah bulat; hasil akhir tidak boleh negatif.

**Kriteria penerimaan**

- Harga 1 bulan tanpa referral selama promo aktif adalah Rp150.000; di luar masa promo Rp200.000.
- Promo + referral persentase 10% menghasilkan Rp135.000 per bulan. Promo + referral nominal Rp10.000 menghasilkan Rp140.000 per bulan.
- Invoice 3 bulan saat promo aktif menyimpan harga normal Rp600.000, promo Rp150.000, referral terpisah, dan total yang dapat direkonsiliasi.
- UI menampilkan harga normal, potongan promo, potongan referral, total, dan durasi dengan rincian yang sama dengan backend.
- Backend menghitung ulang harga dari paket dan kode yang valid; nominal yang dikirim client diabaikan.
- Status langganan dan entitlement premium Owner berlaku konsisten untuk semua cabang miliknya.
- Maksimum cabang terdefinisi sebagai 5 termasuk cabang utama; aturan tier dan kuota tidak lagi berbeda antara UI dan backend.

**Catatan audit:** invoice saat ini menyimpan total potongan agregat dan `tenantId`; perlu snapshot terpisah untuk promo/referral serta cakupan Owner agar audit pembayaran tetap jelas.

### CC-02 — Manajemen multi-cabang dan konteks cabang aktif

**Prioritas:** P0 · **Depends on:** CC-01

Selesaikan pembuatan dan pengelolaan cabang untuk Owner Premium serta pemilihan cabang aktif. Pembuatan harus mematuhi kuota lima cabang dan menjaga data operasional tetap terisolasi per cabang.

**Kriteria penerimaan**

- Owner dapat melihat daftar cabang yang dimilikinya, membuat cabang sampai batas paket, mengubah profil, dan memilih cabang aktif.
- Cabang keenam ditolak backend dengan pesan batas paket yang jelas; pemeriksaan kuota tetap benar untuk dua permintaan bersamaan.
- Perpindahan cabang memperbarui konteks order, pelanggan, layanan, WhatsApp, kas, laporan, staf, dan pengaturan ke cabang terpilih.
- Owner hanya dapat mengakses cabang dengan relasi kepemilikan yang sah. Staff tetap terbatas pada cabang tempat akun staff terdaftar.
- Endpoint yang menerima `tenantId` memverifikasi hak akses pada server; manipulasi nilai dari client tidak membuka data cabang lain.
- Cabang baru memiliki konfigurasi awal yang aman dan tidak menyalin transaksi, pelanggan, atau kredensial WhatsApp cabang lain.
- Superadmin tetap dapat mengelola semua cabang melalui jalur administrasi yang sudah ada.

### CC-03 — Rilis manajemen staff sesuai entitlement Premium

**Prioritas:** P1 · **Depends on:** CC-01, CC-02

Sebagian besar CRUD staff dan shift sudah ada. Ticket ini membuka fitur sesuai paket, menerapkan kuota dari definisi plan di backend, dan memastikan pengelolaan staff bekerja dalam konteks cabang.

**Kriteria penerimaan**

- Tab staff tidak lagi menampilkan overlay Coming Soon bagi Owner dengan entitlement Premium aktif.
- Owner Premium dapat mengelola staff hanya pada cabang yang dimilikinya; UI, login, serta seluruh operasi staff konsisten dengan konteks cabang.
- Backend menolak penambahan staff yang melampaui `maxStaff` plan dan menolak perubahan hak akses lintas cabang.
- Batas staff di UI berasal dari konfigurasi plan yang sama dengan backend; nilai hardcoded yang berbeda dihapus.
- Reset password, pembekuan akun, shift kasir, dan riwayat rekonsiliasi yang sudah tersedia tetap berfungsi.
- Paket di luar Premium tidak memperoleh kemampuan staff Premium hanya dengan memanggil endpoint secara langsung.

### CC-04 — Cetak struk thermal melalui browser

**Prioritas:** P1 · **Depends on:** CC-01

Ganti klaim koneksi hardware yang disimulasikan dengan alur cetak browser standar. Browser/OS memilih printer; konfigurasi aplikasi mengatur tata letak struk.

**Kriteria penerimaan**

- Tombol cetak membuka dialog cetak browser dan mengirim layout nota yang sudah ada.
- Ukuran 58 mm dan 80 mm menghasilkan lebar serta pemenggalan konten yang benar melalui CSS print.
- Aplikasi tidak mengklaim printer terhubung ketika tidak memegang koneksi hardware; kontrol Bluetooth/USB yang tidak didukung dihapus atau diberi status yang akurat.
- Pembatalan dialog, printer tidak tersedia, dan hasil tanpa printer tetap memberi alur yang dapat dipahami pengguna.
- Nota mencetak informasi transaksi dan QR tracking dengan layout yang konsisten, tanpa elemen dashboard.
- Kriteria perangkat didokumentasikan sebagai printer yang dapat dipilih melalui dialog cetak browser/OS.

### PUB-01 — Hilangkan fallback rahasia dan validasi konfigurasi production

**Prioritas:** P0 · **Depends on:** —

Amankan konfigurasi VPS sebelum deployment: hapus nilai fallback kredensial dan JWT dari Compose production, validasi environment wajib saat startup, dan pastikan secret diberikan di luar repository.

**Kriteria penerimaan**

- Backend menolak startup production jika JWT secret atau konfigurasi database wajib kosong/lemah.
- Compose production tidak menyediakan password database atau JWT secret default yang dapat dipakai di internet.
- `.env.example` hanya berisi nama variabel dan nilai contoh yang tidak dapat dipakai sebagai kredensial.
- Log startup menunjukkan konfigurasi non-rahasia dan tidak pernah mencetak key/token/password.
- Prosedur rotasi secret dan pengaturan secret pada VPS terdokumentasi.

### PUB-02 — Operasi rilis awal pada satu VPS

**Prioritas:** P0 · **Depends on:** PUB-01

Siapkan deployment awal pada satu VPS sesuai keputusan rilis. **Satu VPS adalah single point of failure dan bukan HA**; mitigasi rilis ini berupa backup eksternal, pemantauan, dan prosedur pemulihan.

**Kriteria penerimaan**

- Deployment melalui Docker Compose production memiliki TLS melalui reverse proxy, pembatasan port, restart policy, dan health/readiness check untuk backend, frontend, serta PostgreSQL.
- Backup database dan data persisten (termasuk upload dan sesi yang memang perlu dipertahankan) dikirim ke lokasi di luar VPS dengan retensi yang ditetapkan.
- Prosedur pemulihan diuji di lingkungan non-production dan menghasilkan waktu serta langkah pemulihan yang terdokumentasi.
- Ada pemeriksaan uptime/health dan prosedur respons ketika disk, database, atau container gagal.
- Runbook mencatat bahwa satu node tidak memenuhi HA dan menjelaskan pemulihan dari kehilangan VPS.

### PUB-03 — CI, validasi staging, dan checklist publikasi

**Prioritas:** P0 · **Depends on:** CC-01 sampai CC-04, PUB-01, PUB-02

Tambahkan pemeriksaan otomatis monorepo dan jalur validasi sebelum rilis VPS. Backend sudah memiliki beberapa test; frontend dan coverage alur bisnis perlu dipetakan saat ticket dikerjakan.

**Kriteria penerimaan**

- CI menjalankan install terkunci dan build backend/frontend pada setiap pull request ke branch rilis.
- Test suite yang relevan berjalan di CI; kegagalan build/test memblokir merge.
- Staging memverifikasi signup/login, langganan Owner, 5 cabang, akses staff, kas/arus kas, cetak browser, backup, dan pemulihan.
- Checklist publikasi memiliki pemilik, urutan deployment, verifikasi pascadeploy, rollback, dan kriteria go/no-go.
- Tidak ada kredensial production di CI log, artefak publik, atau repository.

---

## Branch 2 — Midtrans untuk langganan SaaS

### MID-01 — Model transaksi dan status pembayaran Midtrans

**Prioritas:** P0 · **Depends on:** CC-01

Tambahkan pencatatan percobaan pembayaran yang menghubungkan invoice Owner dengan transaksi provider, tanpa mengubah status langganan hanya karena browser kembali dari halaman checkout.

**Kriteria penerimaan**

- Setiap percobaan memiliki `order_id` unik, invoice Owner, provider, status, nominal/currency snapshot, waktu kedaluwarsa, dan referensi transaksi provider.
- Riwayat invoice manual tetap terbaca; status manual dan status provider tidak saling menimpa tanpa aturan transisi.
- Nominal transaksi selalu sama dengan `finalAmount` invoice yang tersimpan.
- Data kunci Midtrans tidak pernah disimpan dalam record pembayaran atau dikirim ke frontend.
- Migrasi database mempertahankan data invoice lama.

### MID-02 — Pembuatan transaksi Snap dari backend

**Prioritas:** P0 · **Depends on:** MID-01

Backend membuat Snap transaction token untuk invoice yang dimiliki Owner. Browser menerima token/client key untuk checkout; Server Key hanya digunakan di backend.

**Kriteria penerimaan**

- Endpoint hanya membuat transaksi untuk invoice milik Owner yang terautentikasi dan belum lunas/kedaluwarsa.
- `order_id` unik dan `gross_amount` bersumber dari invoice yang tersimpan, bukan nilai request client.
- Server Key disimpan sebagai secret VPS; hanya Client Key yang digunakan untuk memuat Snap JS.
- Mode sandbox dan production dipisahkan dengan konfigurasi eksplisit dan aman secara default.
- Kegagalan provider tidak mengubah status invoice menjadi lunas dan dapat dicoba kembali tanpa invoice ganda yang tak terlacak.

### MID-03 — Webhook aman, idempotent, dan aktivasi langganan

**Prioritas:** P0 · **Depends on:** MID-01, MID-02

Proses notifikasi pembayaran provider sebagai sumber status transaksi; aktivasi hanya terjadi setelah pembayaran valid dan sukses.

**Kriteria penerimaan**

- Endpoint callback hanya menerima HTTPS di production, memvalidasi `signature_key` SHA-512 sesuai format resmi Midtrans, serta mencocokkan `order_id`, nominal, currency, dan invoice.
- Notifikasi duplikat aman diproses berulang kali tanpa memperpanjang masa aktif, mencatat biaya, atau komisi dua kali.
- Status pending, settlement, capture/fraud, deny, cancel, expire, refund, dan status tak dikenal dipetakan secara eksplisit; hanya status sukses yang tervalidasi mengaktifkan/perpanjang langganan.
- Callback browser `onSuccess` tidak mengaktifkan langganan.
- Status yang tidak konsisten dapat direkonsiliasi melalui Get Status API Midtrans dan ditulis ke audit log tanpa membocorkan secret.
- Langganan owner diperpanjang satu kali dan berlaku pada seluruh cabang owner sesuai CC-01.

### MID-04 — Checkout langganan dan rekonsiliasi UI

**Prioritas:** P1 · **Depends on:** MID-02, MID-03

Tambahkan pilihan pembayaran Midtrans di alur langganan yang sudah ada, tampilkan rincian harga bertumpuk, dan pulihkan status dari backend setelah pengguna menutup/meninggalkan Snap.

**Kriteria penerimaan**

- Checkout menampilkan harga normal, promo, referral, dan total yang sama dengan invoice backend.
- User dapat membuka Snap, membatalkan, kembali, dan memeriksa ulang status tanpa menganggap callback browser sebagai bukti pembayaran.
- UI membedakan belum membayar, menunggu, sukses, gagal/ditolak, kedaluwarsa, dan pembayaran manual yang menunggu verifikasi.
- Retry menghasilkan percobaan yang dapat diaudit dan tidak mengaktifkan invoice lama yang sudah digantikan.
- Alur diuji pada sandbox untuk promo saja, referral saja, promo+referral, pembayaran sukses, pending, gagal, kedaluwarsa, callback duplikat, dan callback dengan nominal tidak cocok.
- Ada langkah dashboard Midtrans untuk mendaftarkan notification URL dan mengganti kredensial sandbox dengan production saat go-live.

## Referensi teknis Midtrans

- [Snap integration guide](https://docs.midtrans.com/docs/snap-snap-integration-guide): token transaksi dibuat oleh backend; frontend memakai token dan Client Key.
- [Handling notifications](https://docs.midtrans.com/reference/handle-notifications): verifikasi signature, HTTPS, dan pemrosesan idempotent.
- [Access keys](https://docs.midtrans.com/docs/access-keys): Server Key bersifat rahasia dan digunakan untuk operasi server-side.
