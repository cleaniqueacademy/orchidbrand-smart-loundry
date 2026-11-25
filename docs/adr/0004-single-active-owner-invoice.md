# Satu invoice checkout aktif per Owner

**Status:** accepted, 14 November 2026.

Klik dari beberapa tab sebelumnya dapat membuat tagihan untuk durasi berbeda secara bersamaan. Pengguna mengonfirmasi bahwa yang dibutuhkan adalah pencegahan invoice/pembayaran ganda: PostgreSQL mengunci lifecycle per Owner dan membatasi satu invoice aktif, sementara request berulang merujuk invoice yang sama tanpa mengubah harga atau durasinya. Perubahan durasi membutuhkan penutupan tagihan lama yang eksplisit; konflik legacy dan penerimaan yang belum dapat diaktifkan masuk review agar histori uang tidak dihapus untuk memenuhi constraint. QRIS lokal yang sudah tersimpan tidak dapat dibatalkan di bank oleh status aplikasi, sehingga uang yang masuk sesudah cancel/expiry tetap dicatat dan ditinjau.
