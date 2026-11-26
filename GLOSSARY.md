# Laundry Cleanique

Istilah produk untuk operasional outlet laundry dan langganan platform SaaS.

## Outlet dan langganan

**Owner**:
Pengguna yang memiliki bisnis laundry dan satu atau lebih Cabang. Satu Langganan Owner mencakup hingga lima Cabang.
_Avoid_: Tenant Owner Account, akun cabang

**Cabang**:
Satu outlet laundry milik Owner dengan data operasionalnya sendiri.
_Avoid_: tenant (dalam percakapan produk), gerai akun

**Paket Langganan**:
Pilihan akses platform dan kuota yang berlaku pada Owner serta seluruh Cabang miliknya.
_Avoid_: plan, tier (dalam percakapan produk)

**Langganan Owner**:
Periode akses SaaS yang dibayar oleh Owner dan dibagikan ke seluruh Cabang yang dimilikinya, paling banyak lima Cabang pada Paket Premium.
_Avoid_: langganan per cabang

**Invoice Langganan**:
Tagihan untuk Paket Langganan dan durasi tertentu, dengan nilai serta rincian diskon yang dibekukan ketika invoice dibuat.
_Avoid_: tagihan cabang

## Pembayaran langganan

**Invoice Aktif**:
Invoice Langganan yang masih menunggu pembayaran atau pemeriksaan bukti. Satu Owner hanya memiliki satu Invoice Aktif pada satu waktu.
_Avoid_: invoice baru (untuk tagihan lama yang dilanjutkan)

**Invoice Kedaluwarsa**:
Invoice Langganan yang batas bayarnya telah terlewati. Dana yang tetap diterima sesudahnya ditangani melalui peninjauan admin.
_Avoid_: uang tidak valid

**Penerimaan Tidak Sesuai**:
Dana yang benar-benar diterima tetapi nominalnya berbeda dari Invoice Langganan, sehingga memerlukan peninjauan atau pengembalian dana.
_Avoid_: pembayaran hilang, saldo gagal

**Referensi Pembayaran Manual**:
Identitas transaksi pada riwayat bank atau merchant yang diperiksa admin untuk mencatat penerimaan dana.
_Avoid_: nama berkas bukti, referensi QR lokal

**Merchant Langganan**:
Akun penerima pembayaran milik platform yang dikhususkan untuk Langganan Owner. Akun ini terpisah dari penerimaan pembayaran cucian milik Cabang.
_Avoid_: QRIS cabang (untuk pembayaran langganan)

**Penerimaan Pembayaran Langganan**:
Dana yang telah diterima Merchant Langganan untuk pembayaran Invoice Langganan. Penerimaan dana tetap merupakan kejadian keuangan meskipun Aktivasi Langganan memerlukan peninjauan.
_Avoid_: aktivasi pembayaran

**Konfirmasi Pembayaran Langganan**:
Penetapan bahwa Penerimaan Pembayaran Langganan telah terbukti melalui catatan resmi penyedia pembayaran atau verifikasi admin atas penerimaan transfer manual.
_Avoid_: bukti screenshot (sebagai konfirmasi otomatis)

**Batas Pembayaran**:
Batas waktu 24 jam sejak Invoice Langganan diterbitkan bagi Owner untuk menyelesaikan pembayaran atau mengunggah bukti. Melewati Batas Pembayaran mengubah tagihan yang belum dibayar menjadi Invoice Kedaluwarsa.
_Avoid_: batas verifikasi admin

**Estimasi Pemeriksaan Admin**:
Target waktu penanganan oleh admin (1×24 jam) setelah Owner mengunggah bukti pembayaran. Melewati estimasi ini tidak otomatis membatalkan Invoice Langganan atau menghapus bukti yang telah dikirim.
_Avoid_: kedaluwarsa otomatis bukti

**Pencatatan Mutasi Khusus**:
Pencatatan penerimaan dana oleh admin berdasarkan mutasi bank atau merchant untuk kasus pengecualian (seperti dana masuk pada Invoice Kedaluwarsa, tagihan dibatalkan, selisih nominal, atau pembayaran ganda), terpisah dari verifikasi rutin bukti transfer yang menunggu persetujuan.
_Avoid_: verifikasi rutin (untuk mutasi pengecualian)

**Aktivasi Langganan**:
Pemberian periode akses Paket Langganan kepada Owner dan Cabang yang tercakup setelah pembayaran dikonfirmasi dan ketentuan langganan terpenuhi.
_Avoid_: settlement (untuk pemberian akses)

**Pencairan Dana Merchant**:
Pemindahan saldo penerimaan Merchant Langganan ke rekening atau tujuan pencairan yang disepakati dengan penyedia pembayaran.
_Avoid_: pembayaran invoice, payout komisi marketing

## Harga

**Harga Normal Premium**:
Harga daftar Premium sebesar Rp200.000 per bulan sebelum potongan.
_Avoid_: harga asli (tanpa konteks)

**Promo Langganan**:
Potongan sementara Rp50.000 per bulan dari Harga Normal Premium. Promo diterapkan sebelum diskon referral dan dapat ditumpuk dengan satu diskon referral yang valid.
_Avoid_: diskon paket (jika merujuk ke promo ini)

**Kode Referral**:
Kode yang memberikan diskon referral yang memenuhi aturan kelayakan. Jika Promo Langganan dan kode referral berlaku, diskon referral dihitung atas harga setelah promo.
_Avoid_: kupon referral (dalam dokumentasi fitur)
