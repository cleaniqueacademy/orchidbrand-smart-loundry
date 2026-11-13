# Rencana Perbaikan Menuju Produksi

Tanggal: 13 November 2026
Status: **Disetujui pengguna; implementasi pada branch `production-v1`. Gate deployment live tetap terpisah.**

## Sasaran dan batas pekerjaan

Menutup temuan autentikasi, privasi, integritas pembayaran, dan ketahanan data pada implementasi Coming Soon serta Midtrans. Database telah berisi data nyata: histori transaksi, kepemilikan, masa aktif yang telah dibayar, dan bukti pembayaran harus dipertahankan.

Rilis awal tetap satu VPS. Tidak menambah Kubernetes, Redis, message broker, server HA, layanan monitoring berbayar, atau backup cloud otomatis. Backup sederhana sebelum perubahan tetap wajib; satu salinan dapat disimpan di komputer operator di luar VPS. Tidak menjanjikan RPO satu jam atau RTO empat jam yang belum disediakan infrastrukturnya.

## Keputusan produk yang telah disetujui

- Satu Langganan Owner Premium mencakup maksimal lima cabang aktif; stok bahan baku tidak termasuk cakupan.
- Harga normal Rp200.000/bulan, promo aktif mengurangi Rp50.000, lalu satu referral yang valid diterapkan atas subtotal setelah promo.
- Owner kedaluwarsa dapat mengakses billing/perpanjangan; akses operasional dibatasi. Blokir administratif tidak boleh dibuka otomatis oleh pembayaran.
- Perubahan Pro/Premium melalui admin pada rilis awal. Renewal paket yang sama tetap mandiri; tidak ada prorata otomatis.
- Invoice baru berlaku 24 jam; durasi pembelian hanya 1, 3, 6, atau 12 periode. Satu periode tetap 30 hari dan harus dijelaskan pada UI.
- Kuota referral menghitung Owner unik yang menerima manfaat, bukan setiap invoice. Penerima yang sudah sah tetap dapat memakai manfaat selama aturan kampanyenya berlaku meskipun kuota penerima baru habis.
- Tarif komisi dibekukan pada invoice; persetujuan komisi hanya setelah pembayaran valid. Refund/pembayaran ganda ditangani admin dengan pencatatan penyesuaian.
- Cabang dan akun dengan histori transaksi diarsipkan. Hanya cabang/staf aktif menggunakan kuota. Tidak ada penghapusan otomatis histori finansial pada rilis awal.
- AI cloud memakai konteks minimum/agregat tanpa nama, email, nomor telepon, rekening, atau bukti pembayaran.
- Printer memakai dialog browser; Midtrans hanya membayar langganan SaaS. Default waktu bisnis rilis awal: Asia/Jakarta.

## Urutan implementasi

| ID | Pekerjaan | Bergantung pada | Hasil yang harus terbukti |
|---|---|---|---|
| PROD-01 | Pengamanan data dan migrasi | — | Migrasi dapat dilatih tanpa reset atau kehilangan histori |
| PROD-02 | Identitas, sesi, role, dan akses | PROD-01 | Logout/pencabutan akses efektif; expired berbeda dari suspend |
| PROD-03 | Bukti pembayaran privat dan cache browser | PROD-02 | Berkas sensitif hanya dapat dibaca pemilik sah/admin |
| PROD-04 | Transisi invoice dan penerimaan pembayaran | PROD-01, PROD-02 | Pembayaran tercatat tepat sekali dan tidak membuka blokir admin |
| PROD-05 | Harga, referral, komisi, dan perubahan paket | PROD-04 | Quote, invoice, komisi, dan pembayaran memakai aturan yang sama |
| PROD-06 | Arsip cabang/akun dan kuota aktif | PROD-01, PROD-02, PROD-04 | Arsip mempertahankan histori dan tidak melanggar kuota saat restore |
| PROD-07 | WhatsApp, proxy, PWA, dan waktu bisnis | PROD-02, PROD-03 | Sesi persisten, status kirim benar, routing/cache/waktu konsisten |
| PROD-08 | Pembatasan dan penyaringan AI cloud | PROD-02 | Tidak ada PII yang keluar; penggunaan/timeout dibatasi |
| PROD-09 | Operasi satu VPS yang sederhana | PROD-01, PROD-03, PROD-07 | Backup dan restore mencakup direktori yang benar |
| PROD-10 | Regression, migrasi staging, dan gate rilis | Semua di atas | Bukti kelulusan tersedia sebelum perubahan database live |

### PROD-01 — Data dan migrasi

1. Inventarisasi skema dan versi deployment yang benar-benar ada sebelum menyentuh database live. Akses/domain VPS diperlukan pada tahap penerapan, bukan untuk mulai mengerjakan kode.
2. Siapkan backup database, upload, dan direktori sesi WhatsApp aktual dari container lama sebelum mengganti image. Verifikasi checksum dan simpan satu salinan di luar VPS; tidak memerlukan layanan cloud baru.
3. Pisahkan bootstrap admin produksi dari reset/seeder demo. Seeder destruktif harus menolak environment produksi. Jangan menjalankan `db:seed` atau reset pada database nyata.
4. Gunakan migrasi versi yang menambah skema terlebih dahulu dan menjaga kompatibilitas data lama. Tidak mengubah nominal, tanggal transaksi, atau masa aktif yang sudah dibayar secara retroaktif.
5. Tambahkan metadata sesi, berkas privat, status suspend/arsip, expiry invoice, penerima entitlement yang dibekukan, snapshot komisi, dan status rekonsiliasi sesuai kebutuhan nyata setiap perbaikan.
6. Backfill memakai bukti data yang jelas. Status inactive lama yang tidak dapat dibedakan antara expiry dan blokir admin ditandai untuk review, bukan otomatis diaktifkan. Invoice lama yang belum memiliki expiry diperiksa tanpa mengganti harga atau membatalkan pembayaran berjalan secara diam-diam.
7. Ukur jumlah baris, total invoice lunas, total penerimaan/pengeluaran, relasi Owner/cabang, dan keberadaan berkas sebelum/sesudah rehearsal. Selisih yang tidak dijelaskan menghentikan penerapan.

### PROD-02 — Identitas dan sesi

1. Validasi identitas dan role terhadap akun yang masih ada dan diizinkan. Kegagalan validasi database menolak operasi dengan respons yang sesuai, bukan meneruskan akses.
2. Terapkan sesi server yang dapat dicabut, dengan cookie HttpOnly/Secure/SameSite dan perlindungan CSRF untuk operasi browser. Token autentikasi di localStorage dihentikan.
3. Logout mencabut sesi. Reset sandi, blokir, pengarsipan, perubahan role, dan perubahan kepemilikan mencabut akses yang relevan, termasuk superadmin.
4. Lindungi endpoint status pengguna; pengguna membaca identitasnya sendiri, inspeksi pihak lain hanya melalui hak admin yang sah.
5. Pisahkan akun diblokir, akun diarsipkan, dan langganan kedaluwarsa. Owner expired dapat memperpanjang; pembayaran tidak mencabut suspend/arsip administratif.
6. Terapkan throttle login sederhana di backend dan konfigurasi trusted proxy yang benar. IP buatan dari client tidak boleh menjadi cara melewati pembatasan.
7. Pertahankan pemilihan cabang hanya setelah ownership diverifikasi server. Sesi/role/cabang yang disimpan browser tidak menjadi sumber otorisasi.
8. Dampak penerapan: pengguna perlu login ulang satu kali ketika skema sesi baru diaktifkan. Tidak mereset transaksi atau kata sandi pengguna secara massal.

### PROD-03 — Berkas sensitif

1. Pisahkan berkas publik yang memang dibagikan (logo/QRIS) dari bukti pembayaran privat. Akses bukti memeriksa sesi dan kepemilikan invoice/Owner.
2. Catat metadata berkas: pemilik, kategori, lokasi, dan relasi yang diperlukan. Validasi kategori, ukuran request, dan isi file yang sebenarnya; nama/MIME dari browser tidak cukup.
3. Migrasikan relasi bukti lama hanya dari referensi invoice yang dapat dipastikan. Berkas tanpa pemilik jelas masuk daftar review privat, tidak dibuka ke publik atau dihapus otomatis.
4. Perbarui preview/download frontend, Nginx, header no-store, dan service worker. Cache privat lama dibersihkan dan tidak dipakai sebagai fallback setelah logout/offline.
5. Respons anonim dan Owner lain harus ditolak; Owner yang sah serta admin tetap dapat membuka bukti.

### PROD-04 — Pembayaran dan transisi invoice

1. Nyatakan transisi invoice secara eksplisit. Invoice paid tidak dapat kembali menjadi rejected/unpaid akibat stale action atau replay.
2. Approve/reject bersamaan memakai pemeriksaan status dan lock yang sama. Perpanjangan manual admin memiliki idempotency key; retry mengembalikan hasil yang sama.
3. Bekukan identitas Owner penerima entitlement pada invoice. Perubahan kepemilikan cabang tidak mengalihkan hak invoice lama. Perpindahan dengan pembayaran aktif membutuhkan penyelesaian/review terlebih dahulu.
4. Simpan fakta settlement provider secara durable setelah signature, nominal, currency, dan referensinya valid. Kegagalan aktivasi bisnis tidak boleh menghapus jejak uang yang telah diterima.
5. Aktivasi mempunyai status sendiri: berhasil atau menunggu review. Suspend, arsip, perubahan paket, atau ketidaksesuaian kepemilikan menghasilkan kasus rekonsiliasi yang terlihat oleh admin.
6. Duplikasi/stale webhook, timeout, invoice kedaluwarsa, dan pembayaran kedua tidak menggandakan entitlement, biaya, pemasukan, atau komisi.
7. Jangan publikasikan rekening/e-wallet/QRIS placeholder. Kanal pembayaran manual yang belum dikonfigurasi dinonaktifkan dengan pesan admin yang jelas.

### PROD-05 — Kontrak harga, referral, dan komisi

1. Terapkan expiry 24 jam serta durasi 1/3/6/12 periode. Batasi masa checkout provider terhadap masa berlaku invoice; tidak memperpanjang harga promo tanpa batas melalui checkout terlambat.
2. Snapshot harga invoice yang sah tetap dihormati selama masa berlakunya; invoice baru setelah expiry memakai quote baru. Periode dan kampanye ditampilkan konsisten dalam waktu bisnis yang ditetapkan.
3. Renewal self-service hanya untuk paket aktif yang sama. Admin memeriksa perubahan paket dan kuota sebelum membuat tagihan perubahan; tidak menagih downgrade yang tidak dapat diaktifkan.
4. Jadikan referral atribut billing Owner yang konsisten dari cabang mana pun. Staff tidak dapat mengubah harga/kontrak/referral SaaS.
5. Kuota penerima baru memakai pencatatan unik Owner dan transaksi atomik. Penerima lama tidak gagal validasi hanya karena kuota baru habis; status kampanye dan masa berlaku tetap diperiksa.
6. Bekukan tipe/tarif komisi pada invoice; gunakan pembayaran aktual sebagai dasar yang relevan dengan ketentuan komisi. Tidak mengubah hak invoice lama mengikuti edit kode di kemudian hari.
7. Refund/pembayaran ganda memiliki antrean review dan jurnal penyesuaian yang terhubung ke transaksi awal. Perubahan komisi/payout harus dapat diaudit; tidak mengirim pengembalian uang otomatis.

### PROD-06 — Arsip dan histori

1. Ganti jalur hapus cabang/akun yang memiliki histori dengan arsip; hilangkan penghapusan berantai parsial di luar transaksi.
2. Arsip menyimpan invoice, settlement, komisi, arus kas, order, dan referensi pemilik historis. Data lama tetap dapat ditinjau sesuai hak akses.
3. Pembuatan/aktivasi kembali cabang dan staf menghitung kuota aktif secara atomik. Restore ditolak jika kuota akan terlampaui.
4. Pembayaran tidak memulihkan cabang/akun yang telah diarsipkan oleh admin. Perubahan kepemilikan dan arsip tercatat dengan pelaku serta waktunya.

### PROD-07 — Operasional aplikasi

1. Selaraskan direktori `data/wa_sessions` yang benar pada aplikasi, volume, image, backup, dan restore. Jangan mengasumsikan `auth_info_baileys` berisi sesi nyata.
2. Pencatatan WA membedakan queued/sent/failed/skipped. Cooldown bukan bukti pesan terkirim.
3. Lepaskan penundaan pengiriman dari request kasir. Gunakan antrean kerja sederhana dalam PostgreSQL yang sudah ada, dengan retry terbatas dan status yang dapat diaudit; tidak menambah broker/server antrean.
4. Perbaiki precedence proxy gambar upload, header proxy, dan pengecualian cache service worker.
5. Konsistenkan batas akhir langganan, tanggal laporan/shift, dan reminder dalam Asia/Jakarta. Hari terakhir tidak dinonaktifkan lebih awal oleh job trial.
6. Jalankan reminder/reconciliation ringan secara terjadwal dan idempotent pada satu backend, dengan log kegagalan yang jelas. Tidak membuat otomasi chat atau layanan baru.

### PROD-08 — AI cloud

1. Bangun konteks yang diizinkan sebelum memanggil provider. Otorisasi tidak bergantung pada kata-kata dalam prompt pengguna.
2. Kirim agregat dan konteks minimum; keluarkan nama, email, telepon, rekening, bukti, dan kredensial dari payload cloud.
3. Terapkan batas pesan/history, timeout dan jumlah retry, kuota paket yang benar-benar ditegakkan, serta fallback yang terukur.
4. Uji payload provider menggunakan adapter uji, tanpa mengirim data produksi ke cloud selama regression.

### PROD-09 — Satu VPS, tanpa tambahan infrastruktur

1. Lengkapi Compose/reverse proxy TLS, secret wajib, port internal, healthcheck, dan rotasi log Docker yang terbatas.
2. Perbaiki script backup: lokasi data benar, checksum, status backup lokal berbeda dari status salinan eksternal, dan petunjuk restore yang dapat dijalankan.
3. Baseline: backup sebelum setiap perubahan produksi, backup lokal terjadwal sederhana bila disiapkan operator, serta salinan manual di luar VPS. Tidak menambah backup eksternal otomatis atau alert berbayar.
4. Latih restore database + upload + sesi WA pada lingkungan terpisah. Salinan lokal saja tidak melindungi dari kehilangan seluruh VPS; keterbatasan ini dicatat secara eksplisit.
5. Siapkan langkah deployment, pemeriksaan sesudah deploy, dan rollback image. Jangan otomatis mengembalikan database ke backup lama setelah transaksi baru masuk.

### PROD-10 — Pembuktian dan penerapan

1. Pisahkan pembentukan aplikasi dari bootstrap server agar pengujian tidak membutuhkan koneksi atau data produksi.
2. Tambahkan regression untuk logout/revocation/role change/deleted user/DB error, expired renewal/admin suspend, privasi file/cache, dan throttle login.
3. Tambahkan regression invoice paid→reject, approve/reject bersamaan, request manual ganda, perubahan Owner, downgrade, expiry invoice, referral kuota terakhir, serta komisi yang diubah setelah invoice dibuat.
4. Uji settlement tetap tercatat saat aktivasi tertunda, refund/reversal, arsip/restore kuota, dan histori cabang dengan payment attempts.
5. Uji restart container dengan sesi WA, pengiriman skipped/failed, batas tengah malam, AI tanpa PII, serta routing berkas melalui Nginx.
6. Jalankan typecheck/build, audit dependency, test terpilih dan suite relevan yang sudah ada pada database terisolasi. CI harus gagal jika integration suite yang diwajibkan tidak benar-benar berjalan.
7. Lakukan end-to-end browser pada staging: login, cabang, order, pembayaran, arus kas, preview/download, dan cetak. Printer fisik serta merchant sandbox nyata memerlukan lingkungan/perangkat/kredensial yang tersedia.
8. Latih migrasi pada salinan data sebelum penerapan live. Dokumentasikan selisih data, waktu pelaksanaan, dan hasil restore.
9. Publikasi mensyaratkan seluruh blocker kritis tertutup, bukti CI/staging tersedia, tujuan pembayaran benar, backup dapat dipulihkan, serta hasil sandbox merchant lolos untuk branch Midtrans.

## Strategi branch yang berlaku

- Sesuai instruksi terbaru pengguna, implementasi berada di `production-v1`, diturunkan dari `feature/coming-soon-midtrans`.
- `main`, `feature/coming-soon`, dan `feature/coming-soon-midtrans` tidak diubah atau dipublikasikan otomatis.
- Bukti pemeriksaan dan keterbatasan deployment dicatat di `PRODUCTION_V1_READINESS.md`; runbook final ada di `docs/VPS_RELEASE_RUNBOOK.md`.

## Dampak yang perlu diketahui sebelum persetujuan

- Pengguna login ulang satu kali pada perpindahan sesi. Browser boleh menyimpan preferensi cabang/tampilan, tetapi bukan kredensial sesi.
- Tombol hapus permanen yang berisiko diganti dengan arsip. Histori tidak menghilang ketika kuota aktif dibebaskan.
- Owner lama yang inactive dan alasannya ambigu membutuhkan review administratif; tidak diaktifkan otomatis oleh migrasi.
- Perubahan paket memakai bantuan admin. Renewal paket yang sama tetap mandiri.
- Backup data nyata dan kredensial WA harus ditangani dengan izin terbatas; salinan untuk pengujian disanitasi bila memungkinkan tanpa menghilangkan relasi yang diuji.
- Jadwal gangguan singkat, domain/akses VPS, konfigurasi pembayaran, dan kredensial sandbox ditetapkan saat hasil implementasi siap diterapkan. Jangan mengirim secret melalui isi dokumen rencana.

## Batas persetujuan

Persetujuan rencana memulai implementasi kode, migrasi yang dapat ditinjau, dokumentasi, dan pengujian terisolasi. Penerapan ke database/VPS produksi adalah gate terakhir setelah backup dan hasil staging tersedia untuk ditinjau. Tidak ada perubahan live yang dilakukan hanya karena dokumen rencana ini telah dibuat.
