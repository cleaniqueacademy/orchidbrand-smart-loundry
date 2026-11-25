# Hasil implementasi production-v1

Tanggal: 13 November 2026. Branch: `production-v1`, turunan `feature/coming-soon-midtrans`. Status: implementasi dan verifikasi lokal selesai; **belum deploy/publish ke VPS nyata**. Tidak ada data produksi atau kredensial merchant yang digunakan dalam pemeriksaan ini.

## Pekerjaan yang masuk

| Kelompok | Perubahan |
|---|---|
| PROD-01 | Migrasi aditif berseri, backfill bukti/relasi komisi yang dapat dipastikan, legacy inactive tetap review, seed reset ditolak, bootstrap admin terpisah dan hash sandi lama tanpa mencetak nilai. Tanggal/nominal lama dipertahankan. |
| PROD-02 | Sesi server hashed, cookie HttpOnly/Secure/SameSite, CSRF/Origin, logout/revocation, role database terkini, penolakan error DB, throttle login dan proxy tepercaya. Marketing ditolak dari endpoint operasional tanpa scope cabang. |
| PROD-03 | Metadata dan ownership berkas privat, batas ukuran/kategori/magic bytes, no-store, PDF attachment, proteksi Nginx dan cache service worker. Owner tidak dapat mengklaim upload privat admin. |
| PROD-04 | Receipt uang terpisah dari entitlement, paid tidak bisa rejected, idempotency admin, frozen Owner, review legacy/late payment dan retry aktivasi. Suspend/arsip tidak dibuka pembayaran. |
| PROD-05 | Durasi 1/3/6/12 x 30 hari, expiry 24 jam, expiry Snap dengan start_time eksplisit, renewal paket sama, perubahan paket admin dengan kuota diperiksa sebelum penagihan, referral Owner unik/atomik, snapshot komisi dan jurnal refund/payout terkunci. |
| PROD-06 | Penghapusan cabang/akun/marketing menjadi arsip, histori tetap, kuota hanya cabang/staf aktif dan restore diperiksa atomik. Pemindahan role/Owner generik ditolak untuk review agar histori billing tidak berpindah diam-diam. |
| PROD-07 | WA outbox PostgreSQL pada transaksi yang sama dengan order/status, retry/lease/status kirim, perbaikan path sesi, WIB untuk expiry/reminder/tanggal kas, akses nota/cetak dari tabel pesanan. Input item/nominal divalidasi dan total dihitung ulang server. |
| PROD-08 | Cloud menerima intent tetap dan agregat angka; pesan/history/identitas tetap lokal. Kuota Owner harian atomik, batas request/history dan timeout provider. |
| PROD-09 | Compose internal port, runtime user bun, volume benar, log rotation, contoh TLS/trusted proxy, backup lokal dengan checksum dan penanda salinan eksternal yang terpisah. |
| PROD-10 | Suite regresi wajib dan rehearsal legacy pada CI, build/typecheck/audit, image Docker, smoke HTTP/Nginx/browser, latihan restore sintetis. Gate live tercantum di bawah. |

## Bukti verifikasi lokal

- Bun 1.4.4, install `--frozen-lockfile --ignore-scripts` berhasil.
- Suite rilis: **89 pass, 0 fail, 319 assertions, 13 file**. Termasuk kegagalan database, settlement yang tetap tersimpan saat aktivasi gagal, konfirmasi admin paralel, paid/reject race, kuota/referral paralel, private uploads dan outbox rollback. Satu eksekusi sempat terkena jeda runtime panjang dan timeout; eksekusi ulang penuh lulus tanpa menaikkan timeout test.
- Backend typecheck/build dan frontend typecheck/build berhasil. Vite masih memberi peringatan ukuran bundle utama sekitar 2.19 MB (gzip sekitar 595 KB); ini keterbatasan performa yang perlu dipantau, bukan error build.
- Image backend/frontend produksi berhasil dibangun; runtime backend diverifikasi uid/gid 1000 (`bun`).
- `bun audit --audit-level high`: tidak ada high/critical; satu advisory moderate pada esbuild development tersisa, dengan penilaian dan tanggal review pada `docs/DEPENDENCY_AUDIT.md`.
- Rehearsal migrasi legacy dua kali: 2 akun, 2 cabang, 4 invoice; total invoice paid Rp175.000 dan tanggal 2027-01-15 / 2027-03-20 tetap. Bukti milik tunggal terikat, bukti ambigu tidak dipublikasikan; profil komisi lama dipulihkan dari ledger yang jelas.
- Backup/restore database terisolasi: checksum valid; 50 akun, 59 cabang, 25 invoice, total invoice paid Rp3.075.000, total nilai baris arus kas Rp3.265.000 cocok. Tujuh upload dan marker direktori WA pulih. Ini fixture sintetis pada saat snapshot, bukan metrik bisnis live.
- Cookie mode production diperiksa melalui request aplikasi: nama `__Host-cleanique_session`, HttpOnly, Secure, SameSite=Lax; Origin asing 403. TLS VPS belum diverifikasi.
- Nginx HTTP smoke: upload privat dan download Owner berhasil, anonim 401, sesudah logout 401, no-store dan isi gambar benar. File tidak tertangkap location static gambar.
- Browser lokal: login Owner, dashboard, renewal hanya Premium untuk Owner Premium, quote Rp200.000 - promo Rp50.000 = Rp150.000, penerbitan invoice, kanal manual kosong disabled, pembuatan pesanan tunai Rp24.000 dan pembacaan buku kas berhasil. Pratinjau nota 58/80 mm, ekspor PDF dan buka/tutup berulang berhasil setelah perbaikan urutan Hook; sesi browser baru tidak mencatat error JavaScript. Tidak ada pesan WA nyata atau transaksi merchant nyata yang dikirim.
- Rehearsal ini tidak menjalankan semua suite HTTP lama yang bergantung pada server eksternal/token lama. CI menyebut suite wajib secara eksplisit; suite production-v1 gagal jika environment database terisolasi tidak tersedia, sehingga integration tidak lolos lewat skip diam-diam.

## Gate sebelum publish yang masih membutuhkan lingkungan nyata

1. Rehearsal salinan database VPS, inventaris path upload/sesi WA container lama, review akun inactive/arsip dan invoice lama yang ambigu.
2. Backup data nyata + salinan di luar VPS, checksum, dan restore salinan tersebut oleh operator berwenang.
3. Domain/TLS/trusted proxy, secret produksi, kepemilikan volume user bun, dan konfigurasi rekening/e-wallet/QRIS yang benar. Periksa nilai demo lama yang mungkin sudah tersimpan.
4. Merchant Midtrans sandbox nyata: settlement/pending/deny/expire/replay/refund/double-payment dan notification URL, kemudian konfigurasi production oleh pemilik merchant.
5. Koneksi WA nyata sesudah pergantian container, uji perangkat printer 58/80 mm, dan smoke staging dengan akun/role representatif.
6. CI remote pada commit rilis. Pemeriksaan lokal tidak sama dengan hasil workflow remote.

Panduan tindakan, maintenance, review invoice, bootstrap/hash kredensial, backup/restore dan rollback tersedia di `docs/VPS_RELEASE_RUNBOOK.md`. Tidak ada deploy live, push remote atau perubahan pada `main` dalam pekerjaan ini.
