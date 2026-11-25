# Implementasi QRIS Saurus lokal

Tanggal: 14 November 2026. Branch: `codex/fix-admin-cashflow`. Ini adalah pembuatan QR bernominal lokal, bukan aktivasi otomatis melalui API merchant.

Penguncian satu invoice aktif per Owner, pembatalan, kedaluwarsa, penerimaan tidak sesuai, audit dan hasil reset lokal tersedia pada [Invoice lifecycle readiness](INVOICE_LIFECYCLE_READINESS.md). Suite gabungan terakhir: **122 pass, 0 fail**; angka 106 pada validasi awal di bawah adalah snapshot sebelum penambahan pengujian lifecycle.

## Alur yang tersedia

1. Admin mengatur gambar QRIS statis merchant platform melalui Setting Platform. PNG/JPG/WEBP diunggah langsung; URL eksternal tidak diambil backend. `/qris.png` hanya digunakan jika dipilih eksplisit pada konfigurasi; asset ini dikemas pula pada image backend produksi.
2. Owner membuat invoice. Checkout langsung memilih QRIS bila dikonfigurasi, lalu meminta `GET /api/subscription/invoices/:id/qris` tanpa mengirim nominal dari browser.
3. Backend memeriksa ownership, akun/Cabang, status invoice, masa berlaku, nominal Rupiah dan gateway attempt yang belum selesai. Gambar lokal dibaca secara terbatas, di-decode, lalu divalidasi melalui QRIS Saurus.
4. `staticToDynamic` mengisi nominal snapshot invoice dan referensi ASCII deterministik, mempertahankan identitas merchant, dan menghasilkan payload dengan CRC baru. `renderQrToDataUrl` merender QR yang ditampilkan dan dapat diunduh. Nominal tidak perlu diketik ulang oleh pembayar.
5. Owner dapat mengganti ke transfer bank. Setelah membayar, bukti diunggah secara privat ke invoice yang sama; admin tetap memverifikasi dana sebelum langganan aktif.

## Batas dan pengamanan

- Paket runtime dipin: `qris-saurus@1.1.0`, `jsqr@1.4.0`, `sharp@0.35.5`. SDK 1.1.0 tidak menyertakan berkas deklarasi tipe yang dijanjikan package.json; deklarasi lokal membatasi pemakaian pada fungsi yang diaudit dan diuji.
- Input gambar maksimum 5 MB dan 12 juta pixel, output decode diperkecil maksimum 1600×1600. Cache decode terbatas delapan file/revisi; endpoint dibatasi 20 request/menit/pengguna pada proses VPS sekarang.
- Hanya `/qris.png` atau upload kategori QRIS terdaftar yang boleh dibaca. Realpath harus berada di direktori yang diizinkan. URL eksternal, traversal, berkas hilang/quarantined, CRC salah, currency selain IDR dan QR yang sudah dinamis ditolak.
- QR hasil generate menggunakan respons private/no-store. QR tidak disimpan sebagai receipt, tidak menambah kas, tidak memberi komisi, dan tidak mengaktifkan langganan.
- Batas bayar invoice tidak membatalkan QR di jaringan pembayaran. QR yang sudah diunduh mungkin tetap dapat dibayar. Pembayaran terlambat/ganda memerlukan review admin; referensi QR lokal belum terbukti tersedia pada laporan merchant untuk matching otomatis.
- Akses API GoPay/DANA dan konfirmasi dana otomatis belum terimplementasi. Nama merchant dan nominal tampil agar diperiksa pembayar; uji struktur/CRC bukan bukti acquirer menerima pembayaran nyata.
- Proses VPS tunggal dan limiter in-memory tetap merupakan batas deployment saat ini; ini bukan implementasi HA atau ledger provider baru.

## Validasi

- Suite backend wajib dan QRIS: **106 pass, 0 fail, 370 assertions, 15 file** pada PostgreSQL terisolasi. Typecheck/build backend dan build frontend berhasil. Audit dependency tidak menemukan high/critical; advisory di bawah ambang high tetap mengikuti penilaian existing.
- Image backend Linux berhasil dibangun dengan install frozen/ignore-scripts; SDK, sharp dan jsQR berhasil generate dari asset terkemas sebagai pengguna non-root. Tidak ada deploy VPS.
- Browser desktop 1280×960 dan mobile 390×844 menampilkan QR hasil SDK langsung tanpa klik pemilihan tambahan; tidak ada overflow horizontal. Respons fixture dengan invoice/nominal salah ditolak. API browser menggunakan respons uji terisolasi yang berisi hasil generator nyata, bukan pembayaran nyata.
- Test payload memakai SDK nyata untuk membuat QR, decode kembali gambar hasil render dan memeriksa nominal, mode dinamis serta identitas merchant. Gambar `/qris.png` yang ada juga berhasil dibaca dan digunakan untuk generate.
- Test HTTP memakai PostgreSQL terisolasi untuk ownership, sesi, Owner expired, staff, paid/expired, open gateway attempt, no-store dan pembatasan request; nominal query browser diabaikan dan invoice tetap unpaid setelah generate.
- Pengujian tidak mengirim pembayaran nyata atau notifikasi merchant. Konfirmasi otomatis tetap memerlukan onboarding, sandbox resmi dan gate migrasi provider pada dokumen rencana.
