# Invoice tunggal, expiry, review pembayaran dan reset lokal

Tanggal: 14 November 2026. Branch: `codex/fix-admin-cashflow`.

## Hasil implementasi

- Maksimum satu invoice dengan status `unpaid`, `rejected`, atau `pending_verification` per Owner melalui constraint PostgreSQL. Penguncian transaksi per Owner menyatukan request dari tab/proses berbeda. Tidak ada server load balancer baru; pengguna mengonfirmasi yang dimaksud adalah pencegahan invoice/pembayaran ganda.
- Request baru dengan syarat sama memakai invoice aktif yang sama. Durasi/paket berbeda mendapat HTTP 409 `ACTIVE_INVOICE` dan invoice lama ditampilkan untuk dilanjutkan. Pembatalan lama harus eksplisit sebelum mengganti tagihan. Harga, referral, durasi dan penerima invoice lama tidak ditimpa.
- Request key yang ikut memakai invoice lama juga disimpan. Retry key tersebut setelah pembatalan tetap merujuk invoice lama; tidak menghasilkan tagihan baru diam-diam.
- Invoice dengan dana tercatat tetapi aktivasi belum selesai, pembayaran tidak sesuai, atau konflik legacy menghalangi checkout baru sampai review selesai. Invoice paid yang sudah aktif atau sepenuhnya dikembalikan sebelum aktivasi tidak dianggap invoice checkout aktif.
- Deadline invoice tetap 24 jam. API memeriksa deadline sebelum generate QR, checkout gateway dan upload bukti. Expiry disimpan saat membaca/membuat tagihan dan melalui worker setiap menit. Bukti yang sudah diunggah sebelum deadline tetap dapat diverifikasi sesudah deadline.
- QR dihapus dari tampilan ketika tidak layak bayar. Riwayat membedakan kedaluwarsa, dibatalkan dan perlu review; tidak melabelinya sebagai belum dibayar atau terverifikasi secara keliru.
- Owner dapat membatalkan tagihan yang belum dibayar/tidak mempunyai bukti. Gateway yang hasilnya belum pasti harus direkonsiliasi dahulu. Admin dapat menutup kasus review setelah memastikan penerimaan/refund selesai. Pembatalan tidak menghapus histori atau mengubah invoice paid menjadi batal.
- QRIS Saurus tetap hanya membuat QR bernominal lokal. **Expiry/pembatalan di Cleanique tidak membatalkan QR yang tersimpan di jaringan QRIS.** Untuk penolakan pembayaran di sisi penyedia diperlukan kemampuan expiry/cancel resmi acquirer; akses ini belum tersedia.

## Matriks penanganan pembayaran

| Keadaan | Perlakuan |
|---|---|
| Klik bersamaan atau beberapa tab | Satu invoice aktif; request sepadan memakai invoice yang sama |
| Ingin durasi baru ketika invoice lama aktif | Lanjutkan invoice lama atau batalkan secara eksplisit, lalu buat invoice baru |
| Invoice melewati deadline | Status expired, generate QR/checkout/upload bukti ditolak |
| Bukti masuk sebelum deadline dan sedang ditinjau | Tetap pending verification; tidak membuat tagihan kedua |
| Uang masuk pada invoice batal/kedaluwarsa | Admin mencatat nominal, waktu, referensi bank/merchant dan catatan pemeriksaan; paid tetap terpisah dari aktivasi |
| Nominal berbeda | Penerimaan dan kas dicatat, invoice masuk review; tidak langsung memberi akses |
| Referensi bank dipakai ulang | Ditolak untuk invoice berbeda; replay data sama pada invoice sama tidak menggandakan kas |
| File bukti dipakai untuk invoice lain | Ditolak; upload bukan bukti otomatis settlement |
| Dua pembayaran nyata untuk satu invoice | Keduanya masuk jurnal; entitlement tidak diperpanjang dua kali |
| Refund | Jurnal hanya mencatat pengembalian yang sudah dilakukan operator, tidak mengirim uang; dibatasi penerimaan aktual |
| Refund penuh sebelum aktivasi | Invoice tetap paid sebagai fakta penerimaan, aktivasi berstatus refunded dan invoice baru diperbolehkan |
| Refund pada langganan sudah aktif | Tidak otomatis mencabut akses; perubahan akses tetap keputusan admin sesuai kebijakan yang sudah ada |
| Settlement gateway sah terlambat diberitahukan | Waktu bayar penyedia menentukan ketepatan deadline; penerimaan tetap dicatat, pembatalan/pengecualian membutuhkan review |

Pengisian referensi pada penerimaan manual adalah keputusan admin setelah memeriksa mutasi/riwayat merchant; bukan API yang membuktikan uang masuk. Pencocokan otomatis GoPay/DANA tetap belum tersedia. Nominal tidak sesuai diselesaikan melalui review/pengembalian dana; tidak ada fitur cicilan atau alokasi ulang otomatis.

## Halaman yang digunakan

- Owner: Status Langganan → lanjutkan/batalkan tagihan, countdown batas bayar, QR bernominal dan Riwayat pembayaran.
- Admin: Arus Kas & Rekap Langganan → filter status, Riwayat pembayaran pada invoice, Catat dana masuk, pembatalan dan jurnal refund. Catat dana masuk tidak langsung mengaktifkan langganan; gunakan review aktivasi setelah penerimaan dan ketentuan paket dipastikan.
- Event lifecycle persisten meliputi tagihan dibuat, QR diterbitkan, proof masuk/ditolak, expired, cancelled, penerimaan, refund dan aktivasi. Owner hanya melihat event/waktu miliknya; rincian internal dan identitas admin tidak diberikan melalui endpoint Owner.

## Migrasi

Migrasi berseri menambah kolom issuance/invalidation, event, receipt manual, request-key alias serta index satu invoice aktif. Invoice legacy ganda yang belum selesai dipindahkan ke `review_required`; nilai, bukti, penerimaan paid dan tanggal langganan tidak dihapus. Migrasi dapat dijalankan ulang tanpa menambah event atau mengganti harga.

## Reset lokal yang sudah dilaksanakan

Target eksplisit: `localhost:5434/cleanique_laundry`, container `cleanique_laundry_postgres`. Tidak ada reset VPS atau database remote.

Prosedur `backend/src/scripts/resetLocalDatabase.ts` menolak production/host remote, mencocokkan port container dengan target, memasang maintenance lokal, membuat dump dan SHA256, memulihkan dump ke database pembanding, serta memeriksa jumlah akun/invoice/order, total invoice paid, jumlah/total kas, receipt manual dan metadata berkas. Truncate hanya dilakukan setelah pembandingan cocok; versi migrasi dipertahankan. Kegagalan seed memicu restore backup; jika restore gagal, maintenance tetap aktif.

Hasil seed: **19 akun** (admin, Owner, 17 marketing), **1 cabang**, **2 paket**, **0 invoice**, **0 order**, **0 sesi lama**. Owner dimulai pada trial tujuh hari. Premium Rp200.000 dengan promo lokal Rp50.000 selama 90 hari untuk pengujian; Pro Rp60.000. Rekening transfer kosong hingga diisi admin. QRIS `/qris.png` memakai asset merchant yang sudah tersedia. WA dimulai manual dan tidak otomatis memakai sesi lama yang tersimpan.

Kredensial tidak dicetak ke console; tersedia pada `backend/users.local.txt`, diabaikan Git dan Docker. Backup tersimpan di `backend/data/backups/`, termasuk manifest checksum dan hasil restore. Upload/sesi WA di disk tidak dihapus oleh reset database; private upload lama tidak tersedia tanpa metadata/otorisasi. Auto-restore WA menghormati mode manual serta status aktif/arsip/suspend Cabang.

Contoh pemakaian ulang hanya jika reset lokal memang diminta:

```powershell
# Jalankan dari backend; tindakan ini menghapus data aplikasi pada database lokal yang disebut.
bun run db:reset-local --database cleanique_laundry --container cleanique_laundry_postgres --reset-local-data
```

## Verifikasi

- Suite akhir pada PostgreSQL terisolasi: **122 pass, 0 fail, 429 assertions, 16 file**. Typecheck dan build backend serta build frontend berhasil. Frontend masih memberi peringatan ukuran bundle utama; pemecahan bundle belum termasuk perubahan lifecycle ini.
- Repro awal: 12 request dengan key berbeda menghasilkan 12 invoice. Sesudah perubahan: satu invoice, termasuk proteksi database saat jalur service dilewati.
- Test PostgreSQL terisolasi mencakup concurrency, retry setelah cancel, expiry, pending proof, konflik gateway, late settlement, receipt manual, nominal berbeda, duplikasi referensi/bukti, refund dan migrasi legacy.
- Rehearsal reset diuji pada database disposable; kegagalan seed saat rehearsal berhasil memulihkan backup. Proses yang diperbaiki kemudian berhasil dan dijalankan pada database lokal target.
- Smoke login admin/Owner dengan akun baru berhasil; halaman admin menunjukkan nol invoice, halaman Owner menunjukkan trial dan riwayat kosong; quote Premium Rp200.000 dikurangi Rp50.000 menjadi Rp150.000 diperiksa melalui browser tanpa membuat invoice nyata di database yang baru direset.
- Sesi login pengujian sudah dicabut. Pemeriksaan akhir database lokal: 19 akun, 1 cabang, 2 paket, 0 invoice, 0 order, 0 sesi dan 0 entri kas.
- Tidak ada pembayaran merchant, transfer refund, pesan WA, deploy VPS atau push remote yang dilakukan.
