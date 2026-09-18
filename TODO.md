# Project Roadmap & TODO List
# Orchid Brand Smart Laundry v2.0

Dokumen ini memetakan status pengerjaan fitur yang **SUDAH SELESAI (Completed)** dan apa saja yang **SEDANG / AKAN DIKERJAKAN (Backlog & Roadmap)**.

---

## 📊 Ringkasan Status Pengerjaan

- **Status Dasar & Setup Monorepo:** 100% Selesai
- **Core Dashboard & Operasional Kasir:** 100% Selesai (termasuk Edit, Batal, & Hapus Pesanan)
- **Cetak Struk Nota Kasir Thermal:** 100% Selesai (58mm/80mm + QR Code Tracking + Layout Presisi)
- **Engine Notifikasi WhatsApp:** 100% Selesai (Hanya terkirim saat status **Siap Diambil** + Jam Buka Outlet)
- **Sistem Arus Kas & Laporan Keuangan:** 100% Selesai (Buku Kas, Export CSV Excel, & PDF Cetak)
- **Multi-Tenant Dashboard:** 100% Selesai (Konsolidasi HQ Superadmin & Dashboard Cabang Owner)
- **Portal Publik Cek Resi Mandiri:** 100% Selesai (Prioritas P0 - `/track/:invoiceNo` + QR Code)
- **Master Layanan & Pelacakan SLA Pengerjaan:** 100% Selesai (Prioritas P0 - Tabel `services` + SLA warning)
- **Keamanan Kredensial (Hash Password Bcrypt):** 100% Selesai (Prioritas P0 - Native Bun bcrypt + auto-upgrade)
- **Manajemen Shift Kasir & Rekonsiliasi Kas:** Direncanakan (Prioritas P1)
- **Manajemen Bahan Baku / Stok Deterjen:** Ditunda / Parkir Sesuai Arahan (Prioritas P2)

---

## ✅ Yang SUDAH Selesai (Completed)

### 1. Inisialisasi Monorepo & Infrastruktur
- [x] Repository Git monorepo terhubung ke remote `origin/main`.
- [x] Konfigurasi `.gitignore` monorepo lengkap (mengabaikan `node_modules`, `data/*.db`, `.env`, build dist).
- [x] Konfigurasi Bun Workspaces (`backend`, `frontend`) dengan script satu perintah `bun dev`.
- [x] Dockerization lengkap: Dockerfile backend, frontend (Nginx), dan `docker-compose.yml` persisten PostgreSQL.

### 2. Backend & Basis Data (Bun + Hono + Drizzle + PostgreSQL)
- [x] Skema database relasional PostgreSQL: `users`, `tenants`, `customers`, `orders`, `expenses`, `services`.
- [x] Auto-seed data demo saat startup pertama (`seed.ts` & default master services).
- [x] Auto-migration skema database terintegrasi (`initPostgresTables` dengan DDL idempotent).
- [x] REST API CRUD lengkap: Orders, Customers, Expenses, Users, Tenants, Services, Cashflow Stats.
- [x] Validasi status langganan tenant & kontrol status aktif/nonaktif.
- [x] **Keamanan Password:** Native Bun bcrypt hashing (`Bun.password.hash`) saat register/buat user & tenant, login verify (`Bun.password.verify`), auto-upgrade password plaintext lama ke bcrypt hash saat login pertama.

### 3. Kasir POS & Operasional Toko
- [x] **Pencatatan Order Fleksibel & Cepat**: Dukungan kiloan, satuan (Bedcover, Jas, Sepatu), dan item jamak.
- [x] **Nomor Rak / Keranjang (`rackNumber`)**: Input lokasi rak cucian tersimpan di DB, tabel kasir, struk thermal, dan notifikasi WA.
- [x] **Pendaftaran Pelanggan Instan (Inline Rapid Customer)**: Tambah pelanggan langsung di modal pesanan.
- [x] **Siklus 6 Tahap Status Cucian**: `pending` ➔ `washing` ➔ `drying_ironing` ➔ `ready` ➔ `completed` / `cancelled`.
- [x] **Koreksi & Pembatalan Pesanan Kasir**: Modal `EditOrderModal`, tombol Batalkan, dan Hapus Pesanan permanen.
- [x] **Pelunasan Cepat Kasir (Quick Pay)**: Popover 1-klik lunas dengan Tunai, QRIS, atau Transfer.
- [x] **Deteksi & Filter "Cucian Menginap" (>3 Hari)**: Badge peringatan otomatis di dasbor kasir.
- [x] **Pelacakan SLA & Peringatan Telat SLA (*Late SLA Warning*)**: Estimasi jam target pengerjaan dihitung otomatis dari durasi layanan (`estimated_completion_at`), badge merah telat, dan filter kasir "Telat SLA ⚠️".

### 4. Engine Notifikasi WhatsApp Cerdas (Baileys & Manual)
- [x] **Aturan Pengiriman Terkontrol:** WhatsApp otomatis **hanya dikirimkan saat status cucian diubah ke Siap Diambil (`ready`)**.
- [x] **Pemberitahuan Jam Buka Outlet:** Format pesan WhatsApp mencantumkan informasi jam operasional:
  - *Senin - Jumat : 08.00 - 16.00*
  - *Sabtu : 08.00 - 13.00*
- [x] **Integrasi Baileys QR Code:** Scan QR langsung di pengaturan, auto-reconnect berkala, dan simpan session disk terisolasi.
- [x] **Fallback Manual via wa.me:** Tombol tautan langsung jika outlet memilih mode manual.

### 5. Cetak Struk Kasir Thermal & Portal Publik Cek Resi
- [x] Modal pratinjau struk thermal (`ReceiptModal.tsx`) authentic.
- [x] Pilihan ukuran kertas thermal: **58mm** (Bluetooth saku) dan **80mm** (Desktop POS).
- [x] **Tautan QR Code Dinamis ke Portal Tracking Publik:** Scan QR pada kertas struk langsung membuka halaman cek resi mandiri customer `${origin}/track/:invoiceNo`.
- [x] Tombol **Salin Teks Nota** & **Salin Link Tracking Publik** untuk dikirimkan ke pelanggan.
- [x] Pratinjau jam buka outlet pada kertas struk fisik.
- [x] Cetak langsung browser via `@media print` presisi tanpa margin kosong berlebih.
- [x] **Halaman Publik Cek Resi (`/track/:invoiceNo`):** UI mobile-first yang bersih, elegan, stepper progres 4 tahap, lokasi rak, rincian biaya & pembayaran, rincian item, dan tombol WhatsApp outlet.

### 6. Master Layanan & Dynamic Pricing (SLA)
- [x] Master data layanan (`/api/services`) tersimpan di database relasional PostgreSQL.
- [x] Menu tab operasional **Layanan** untuk mengelola harga dasar, satuan (kg/pcs/meter/pasang), minimum order, dan durasi SLA (jam).
- [x] Form kasir secara dinamis mengambil daftar layanan dari database beserta harga dan durasi SLA otomatis.

### 7. Arus Kas & Laporan Keuangan
- [x] Akumulasi otomatis uang masuk dari pesanan berstatus `paid`.
- [x] Pelacakan piutang tagihan pelanggan (`unpaid`).
- [x] Form pencatatan uang keluar operasional (`expenses`).
- [x] Perhitungan laba bersih dinamis (`Omset Lunas - Pengeluaran`).
- [x] Ekspor laporan buku besar format **CSV (UTF-8 BOM)** langsung kompatibel Microsoft Excel.
- [x] Cetak dokumen resmi ber-kop surat outlet ke format **PDF**.

---

### 🟡 Prioritas Menengah (P1 - Enhancement & Operasional)

#### 4. Multi-Staff / Akun Kasir per Outlet
- [ ] Tenant Owner dapat membuat akun Kasir/Staff tambahan di cabangnya.
- [ ] Role `staff` hanya memiliki akses ke kasir order dan update status pengerjaan, tidak dapat melihat total laba bersih toko atau menghapus pesanan.

#### 5. Shift Kasir & Rekonsiliasi Uang Fisik Laci
- [ ] Modal Buka Shift Kasir (input kas modal awal uang kembalian).
- [ ] Modal Tutup Shift Kasir (hitung total uang fisik di laci vs uang masuk cash sistem).
- [ ] Riwayat selisih kas kasir (*cash discrepancy report*).

#### 6. Log Riwayat Pengiriman WhatsApp
- [ ] Tabel `wa_logs` untuk mencatat riwayat pesan (No. Tujuan, Waktu, Status Terkirim/Gagal).
- [ ] Indikator status notifikasi di tabel pesanan.

---

### 🟢 Prioritas Rendah / Ditunda (P2 - Backlog Parkir)

#### 7. Manajemen Stok Bahan Baku (Chemical & Packaging Inventory)
- [ ] *(Status: Ditunda / Nanti Dulu sesuai arahan)*
- [ ] Tabel stok deterjen, parfum, plastik packing, dan hanger.
- [ ] Pengurangan otomatis atau pencatatan restock barang ke `expenses`.

#### 8. Pengujian Otomatis & CI/CD
- [ ] Unit testing API dengan `bun test`.
- [ ] GitHub Actions workflow untuk verifikasi build monorepo.
