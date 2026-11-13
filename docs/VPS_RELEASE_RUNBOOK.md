# Rilis awal pada satu VPS

Deployment ini memiliki satu titik kegagalan VPS. Backup di luar VPS dan pemulihan wajib diverifikasi sebelum publikasi.

## Konfigurasi

1. Gunakan branch `feature/coming-soon` yang telah lolos CI; simpan commit yang dirilis untuk rollback.
2. Siapkan `.env` di VPS dengan izin 600. Isi `POSTGRES_USER`, `POSTGRES_DB`, password acak, `JWT_SECRET` acak minimal 32 karakter, serta `APP_ORIGIN` HTTPS tanpa trailing slash. Jangan masukkan kredensial ke Git.
3. Pastikan Docker Compose tersedia. Reverse proxy host harus meneruskan domain HTTPS ke `127.0.0.1:8081`; buka hanya port HTTPS/SSH yang diperlukan. PostgreSQL dan backend tidak diterbitkan langsung.
4. Jalankan `docker compose -f docker-compose.prod.yml up -d --build`. Tunggu semua health check sehat; periksa `/api/health` melalui domain publik.
5. Admin mengatur awal/akhir promo Premium melalui pengaturan paket. Promo Rp50.000 tidak aktif ketika kedua waktu belum diisi; tidak ada tanggal kampanye yang ditebak oleh deployment.

## Backup dan pemulihan

- Jalankan `scripts/ops/backup.sh` dari scheduler dengan `BACKUP_ROOT` absolut, `BACKUP_REMOTE` lokasi rsync SSH di luar VPS, `POSTGRES_USER`, dan `POSTGRES_DB`. Gunakan SSH key khusus backup dan penyimpanan eksternal terenkripsi.
- Backup menyertakan dump PostgreSQL, upload, dan sesi WhatsApp. Batasi izin direktori backup; data ini mengandung informasi pelanggan dan kredensial sesi.
- Jadwalkan backup harian, simpan minimal 14 backup harian, dan pantau umur backup terakhir serta kapasitas disk. Atur retensi di penyimpanan eksternal agar backup tidak memenuhi disk VPS.
- Sebelum go-live, salin satu backup ke host staging yang terpisah. Validasi `sha256sum -c SHA256SUMS` dari dalam direktori backup.
- Pulihkan `database.dump` dengan `pg_restore` ke database kosong khusus staging. Ekstrak `files.tar.gz` ke direktori kerja backend staging; jangan menimpa production saat latihan.
- Buktikan login, satu invoice lama, order, berkas bukti, serta seluruh cabang dapat dibaca. Catat lama pemulihan dan petugas yang menjalankan; target waktu harus ditetapkan berdasarkan hasil latihan.
- Backup DB dan berkas diambil berurutan. Untuk titik pemulihan konsisten pada transaksi yang mengacu upload terbaru, lakukan backup dalam jendela maintenance saat proses upload dihentikan.

## Verifikasi dan rollback

- Uji signup/login, perhitungan promo + referral, pembayaran manual, isolasi cabang, kuota cabang keenam, akun kasir, arus kas, dan dialog cetak browser 58/80 mm.
- Pantau health HTTP setiap menit, kegagalan container, ruang disk, log error, dan keberhasilan pengiriman backup.
- Migrasi penambahan kolom menjaga invoice lama. Sebelum deploy, buat backup dan simpan image sebelumnya.
- Jika verifikasi gagal, hentikan akses publik sementara, kembalikan image commit sebelumnya, dan verifikasi kompatibilitas skema. Jangan menghapus kolom atau memulihkan database production tanpa review dampak transaksi sejak backup.
- Publikasi memerlukan bukti CI lulus, hasil smoke test staging, uji cetak perangkat, backup eksternal sukses, dan latihan restore. Penyediaan domain, TLS, kredensial, serta akses VPS dikerjakan operator deployment.
