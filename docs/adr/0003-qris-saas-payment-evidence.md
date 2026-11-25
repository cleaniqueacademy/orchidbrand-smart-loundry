# Bukti pembayaran resmi dipisahkan dari pengolahan QR dan aktivasi

**Status:** accepted untuk pembuatan QR bernominal lokal dan pemisahan bukti pembayaran; provider konfirmasi otomatis masih menunggu akses resmi.

Atas permintaan pengguna pada 14 November 2026, QRIS Saurus membuat QR bernominal dari QR statis merchant platform di backend dan QR langsung ditampilkan setelah invoice dibuat. Hal ini dapat berjalan tanpa API merchant: nominal berasal dari snapshot invoice, identitas merchant dipertahankan, dan konfirmasi pembayaran tetap melalui verifikasi admin. Transformasi payload QR tidak membuktikan penerimaan dana atau membatalkan QR ketika invoice expired; aktivasi otomatis tetap mensyaratkan bukti transaksi dari integrasi resmi GoPay/GoBiz atau provider yang nantinya disepakati, serta pengujian sandbox.
