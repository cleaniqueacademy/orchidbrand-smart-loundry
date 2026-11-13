# Rilis production-v1 pada satu VPS

Branch implementasi: `production-v1`, berdasarkan `feature/coming-soon-midtrans`. Main dan dua branch fitur sebelumnya tidak dipindahkan. Tidak ada deployment live otomatis. Satu VPS tetap satu titik kegagalan; tidak ada janji HA/RPO/RTO yang belum diuji.

## Sebelum deployment

1. Simpan commit/image sebelumnya, versi skema, inventaris volume, jumlah akun/cabang/order/invoice lunas, total invoice lunas dan arus kas. Cocokkan setelah rehearsal dan deployment. Jalankan CI wajib pada checkout rilis.
2. Buka maintenance pada reverse proxy host untuk memblokir perubahan pengguna, tunggu request upload/pembayaran aktif selesai. Provider dapat mengulang webhook; lakukan rekonsiliasi setelah maintenance. Backup DB dan file berurutan membutuhkan jendela tanpa penulisan agar konsisten.
3. **Deployment lama memiliki mount WA yang salah. Sebelum menghapus container lama**, periksa `pwd`, `data/wa_sessions`, `auth_info_baileys` dan lokasi upload aktual dari container tersebut. Selamatkan sesi dari writable layer dengan `docker cp` bila belum masuk volume. Jangan menganggap volume lama berisi sesi yang benar. Catat keberadaan/checksum berkas sebelum mengganti container.
4. Jalankan `scripts/ops/backup.sh` dengan `BACKUP_ROOT` absolut, `POSTGRES_USER`, `POSTGRES_DB`. Nama container default: `cleanique_postgres` dan `cleanique_backend`; sesuaikan `BACKUP_DB_CONTAINER`/`BACKUP_APP_CONTAINER` bila berbeda. Script baru mengarsip `data/uploads` dan `data/wa_sessions` dari `/app/backend`; untuk layout lama selesaikan inventaris/copy dahulu.
5. Pastikan `local_completed_at` dan `SHA256SUMS` tersedia. Salin direktori backup secara manual ke komputer operator di luar VPS lalu verifikasi checksum di sana. `BACKUP_REMOTE` hanya opsional bila rsync SSH memang tersedia. Penanda `external_copy_completed_at` dibuat setelah rsync sukses. Local backup saja tidak melindungi kehilangan seluruh VPS.
6. Restore backup ke lingkungan terisolasi: `sha256sum -c SHA256SUMS`, `pg_restore --exit-on-error --single-transaction` ke database kosong, lalu ekstrak arsip berkas ke direktori backend staging. Jangan gunakan opsi clean/reset terhadap database live. Cocokkan metrik, invoice lama, bukti privat, relasi cabang/Owner, dan marker sesi. Kredensial WA nyata tetap membutuhkan uji koneksi; marker sintetis hanya membuktikan persistensi file.
7. Latih migrasi pada salinan data nyata dengan akses terbatas. Fixture legacy otomatis di `backend/src/scripts/rehearseProductionV1.ts` membuktikan migrasi aditif, replay, nilai invoice dan tanggal tetap, tetapi tidak menggantikan rehearsal salinan database VPS.

## Konfigurasi VPS

- Simpan environment di VPS dengan izin 600. `APP_ORIGIN` harus origin HTTPS tepat tanpa trailing slash; `POSTGRES_PASSWORD` dan `JWT_SECRET` wajib acak. Server Key tidak pernah dikirim ke browser.
- Compose produksi hanya menerbitkan frontend ke `127.0.0.1:8081`. PostgreSQL dan backend tetap internal. `TRUST_PROXY=true` hanya aman dengan jalur ini; host Nginx **wajib menimpa** `X-Real-IP` menggunakan `$remote_addr` dan `X-Forwarded-For`, bukan mempercayai header client.
- Contoh blok host di `scripts/ops/nginx-host.conf.example`; ganti domain dan sertifikat yang benar, jalankan `nginx -t` sebelum reload. Jangan mempublikasikan port backend untuk melewati proxy.
- Direktori persisten: `UPLOADS_DIR=/app/backend/data/uploads`, `WA_SESSIONS_DIR=/app/backend/data/wa_sessions`. Image menjalankan user `bun`. Volume lama perlu kepemilikan user tersebut sebelum image baru berjalan; gunakan maintenance dan perintah administratif terarah pada dua direktori tersebut. Jangan chmod 777 atau mengubah direktori di luar volume aplikasi.
- Rotasi log Docker dibatasi 10 MB x 3 per service. Operator tetap memeriksa health, kapasitas disk, usia backup, serta kasus pembayaran tertahan. Backup lokal terjadwal dapat memakai cron biasa; salinan keluar VPS tetap diverifikasi operator.

## Migrasi dan kredensial lama

1. Jalankan migrasi aditif dengan image baru di maintenance. Bootstrap server menjalankan `initPostgresTables`; jangan memakai `drizzle push --force`, reset, atau demo seeder pada data nyata.
2. Akun inactive lama tetap diblokir untuk review. Pemulihan Owner dan cabang dilakukan secara eksplisit melalui pengaturan status; pembayaran tidak membuka suspend/arsip. Periksa masa aktif dan kuota sebelum pemulihan.
3. Token browser lama dihentikan. Pengguna login ulang satu kali. Password plaintext lama ditolak oleh login baru: operator menjalankan `db:hash-legacy` untuk dry-run jumlah, lalu `APPLY_LEGACY_HASH=yes` pada command yang sama saat maintenance. Nilai password tidak dicetak; tidak ada reset massal kata sandi. Akun dengan format lama tidak valid membutuhkan reset administratif.
4. Jika database benar-benar belum memiliki superadmin, gunakan `db:bootstrap-admin` dengan `BOOTSTRAP_ADMIN_EMAIL` dan sandi acak 16-128 karakter melalui environment. Tool menolak menimpa akun admin yang ada dan tidak membuat rekening/pelanggan demo.
5. Invoice lama tanpa expiry tidak diubah harga atau dibatalkan otomatis. Admin meninjau paket/alasan melalui daftar invoice. Review invoice belum lunas memberi jendela pembayaran baru 24 jam dengan nominal lama; invoice lunas dapat diberi keputusan aktivasi yang diaudit. Kepemilikan, blokir, dan kuota tetap diperiksa.
6. Bukti lama hanya diberi pemilik bila referensi invoice memastikan satu Owner. Bukti ambigu/tidak terdaftar tetap privat; URL luar tidak ditampilkan sebagai preview. Tidak ada penghapusan bukti otomatis.

## Billing dan operasional

- Renewal mandiri hanya paket yang sama. Admin dapat mengubah Pro/Premium pada form konfirmasi billing; kuota diperiksa sebelum tagihan dibuat, tanpa prorata otomatis. Satu periode adalah 30 hari, tersedia 1/3/6/12 periode.
- Invoice baru berlaku 24 jam. Checkout Snap memakai awal expiry eksplisit dan sisa durasi invoice. Harga server dibekukan pada invoice; promo diterapkan sebelum referral, komisi dibekukan saat penerbitan.
- Penerimaan uang dan aktivasi memiliki status terpisah. Invoice lunas tidak dapat ditolak kembali. Aktivasi tertahan tidak menghilangkan uang; lihat antrean review, koreksi penyebab, lalu proses ulang.
- Refund/pembayaran ganda membutuhkan transfer manual oleh operator. Catat referensi dan nominal lewat jurnal refund; koreksi komisi mengurangi saldo tersedia. Jurnal tidak mentransfer uang atau otomatis mengubah masa aktif. Putusan entitlement dicatat dan diselesaikan admin sebelum menutup kasus.
- Kanal manual kosong dinonaktifkan. Verifikasi semua rekening/e-wallet/QRIS yang pernah diisi, termasuk kemungkinan nilai demo lama, sebelum membuka akses publik. Tidak ada fallback rekening contoh pada API/UI billing baru.
- WhatsApp dikirim dari antrean PostgreSQL: queued/sent/failed/manual_pending. Cooldown tetap antrean dan tidak dilabeli sent. Retry dibatasi; pengiriman setelah crash bersifat at-least-once sehingga pesan ganda tetap mungkin bila proses mati sesudah provider menerima pesan tetapi sebelum pencatatan lokal.
- AI cloud hanya menerima intent tetap dan agregat angka. Pesan bebas, history, nama/kontak/rekening/bukti tetap lokal. Kuota pesan harian bersama seluruh cabang Owner; satu percobaan cloud memakai satu kuota, termasuk fallback provider. Timeout per provider 12 detik, maksimal satu model per provider.

## Midtrans

1. Gunakan sandbox dahulu: `MIDTRANS_ENABLED=true`, `MIDTRANS_IS_PRODUCTION=false`, Server Key sandbox di environment. Notification URL HTTPS: `APP_ORIGIN/api/payments/midtrans/notifications`.
2. Snap redirect tidak memerlukan Client Key/JS pada browser. Webhook memeriksa signature lalu mengambil status provider melalui API terautentikasi; jangan menerima status hanya dari browser atau signature nominal saja.
3. Buktikan settlement, pending, deny, expire, replay, keterlambatan, refund dan pembayaran kedua pada merchant sandbox nyata. Cocokkan nominal, pencatatan tepat sekali dan entitlement Owner di seluruh cabang.
4. Timeout create tetap berstatus belum pasti; gunakan Periksa Status. Provider 404 belum cukup untuk membuat charge lain sebelum expiry attempt ditambah toleransi lima menit. Reconciliation berjalan ringan setiap menit pada satu backend.
5. Aktifkan production mode hanya setelah hasil sandbox dan notification URL production diverifikasi operator. Lakukan transaksi nyata kecil dengan otorisasi pemilik merchant.

Referensi: [expiry Snap](https://docs.midtrans.com/docs/snap-advanced-feature), [notifikasi](https://docs.midtrans.com/reference/handle-notifications), [status provider](https://docs.midtrans.com/reference/get-transaction-status).

## Gate rilis dan rollback

- Jalankan build/typecheck, audit, suite CI wajib, rehearsal salinan data, smoke browser staging (login/logout, cabang, order, kas, upload/download privat, cetak 58/80 mm), uji merchant sandbox, backup dan restore.
- Verifikasi cookie `__Host-cleanique_session` HttpOnly/Secure/SameSite melalui domain HTTPS, penolakan CSRF/Origin, isolasi Owner, dan health domain. Browser lokal HTTP memakai cookie development untuk uji fungsi; ini bukan bukti TLS VPS.
- `docker compose -f docker-compose.prod.yml up -d --build` hanya setelah gate di atas ditinjau. Tunggu seluruh healthcheck; periksa kasus invoice/WA tertahan dan bandingkan metrik. Buka maintenance setelah smoke lulus.
- Jika kode bermasalah, aktifkan maintenance dan kembalikan image yang telah diuji kompatibel dengan skema aditif. Jangan mengembalikan DB ke backup lama setelah transaksi baru masuk. Perubahan uang yang sudah terjadi membutuhkan rekonsiliasi, bukan penghapusan histori.
