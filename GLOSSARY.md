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
