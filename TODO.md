# Project Roadmap & TODO List
# Orchid Brand Smart Laundry

Dokumen ini memetakan status pengerjaan fitur yang **SUDAH SELESAI (Completed)** dan apa saja yang **BELUM DIKERJAKAN (Pending / Backlog)**.

---

## 📊 Ringkasan Status

- **Status Dasar & Setup Monorepo:** 100% Selesai
- **Core Dashboard & Operasional Kasir:** 80% Selesai
- **Sistem Arus Kas (Uang Masuk & Keluar):** 85% Selesai
- **Multi-Tenant & Notifikasi WA:** 75% Selesai
- **Autentikasi & Keamanan:** 20% (Belum terintegrasi login session)
- **Fitur Lanjutan (Cetak Nota Thermal, Stok Barang, Export):** 0% (Backlog)

---

## ✅ Yang SUDAH Selesai (Completed)

### 1. Inisialisasi Monorepo & Git
- [x] Repository Git diinisiasi dan terhubung ke remote `origin/main`.
- [x] Konfigurasi `.gitignore` monorepo lengkap (mengabaikan `node_modules`, `backend/data/*.db`, `.env`, build dist, dan file OS).
- [x] Konfigurasi root `package.json` dengan Bun Workspaces (`backend`, `frontend`).
- [x] Konfigurasi script dev satu perintah: `bun dev` dari root menjalankan backend (port 5000) dan frontend (port 5173) secara paralel.
- [x] Dockerization lengkap: `Dockerfile` backend (Bun), `Dockerfile` frontend (Nginx/Vite), dan `docker-compose.yml`.

### 2. Backend & Basis Data (Hono + Bun + Drizzle + PostgreSQL)
- [x] Skema database relasional PostgreSQL (pg-core):
  - `users` (superadmin & tenant owner)
  - `tenants` (relasi 1 user = 1 tenant)
  - `customers` (data pelanggan laundry per tenant)
  - `orders` (transaksi cucian, berat/qty, status proses, status pembayaran, nota invoice)
  - `expenses` (pencatatan uang keluar operasional)
- [x] Auto-seed data demo saat startup pertama (`seed.ts`).
- [x] REST API CRUD lengkap:
  - `GET /api/health`
  - `GET /api/tenants` & `POST /api/tenants`
  - `GET /api/customers` & `POST /api/customers`
  - `GET /api/orders` & `POST /api/orders`
  - `PATCH /api/orders/:id/status` (dengan generator URL WhatsApp dan format pesan otomatis)
  - `PATCH /api/orders/:id/payment` (update lunas/belum lunas)
  - `GET /api/expenses`, `POST /api/expenses`, `DELETE /api/expenses/:id`
  - `GET /api/stats/cashflow` (kalkulasi omset lunas, piutang, total pengeluaran, laba bersih)

### 3. Frontend Dashboard Admin (React + Vite + Tailwind CSS)
- [x] Navigasi Tab Dashboard:
  - **Overview:** 4 Kartu Metrik Keuangan Utama (Total Omset Masuk, Piutang Belum Lunas, Biaya Keluar, Laba Bersih), statistik status cucian aktif, dan daftar transaksi terbaru.
  - **Orders (Kasir Laundry):** Tabel pesanan, filter status proses, filter status pembayaran, tombol update status cepat, modal buat order baru dengan kalkulasi harga otomatis.
  - **Cashflow (Arus Kas):** Visualisasi pemasukan vs pengeluaran, daftar pengeluaran harian, modal input pengeluaran baru, hapus pengeluaran.
  - **Customers:** Daftar direktori pelanggan, pencarian nama/no telp, modal tambah pelanggan baru, quick action chat WA.
  - **Tenants (Superadmin View):** Daftar cabang outlet, pemilik akun, no telepon, alamat, total pesanan, dan total omset per cabang, serta modal daftar outlet baru.
- [x] Integrasi Notifikasi WhatsApp:
  - Auto format nomor HP (`08xxx` -> `628xxx`).
  - Generate link direct `wa.me` dengan template pesan status cucian siap ambil lengkap dengan rincian nota dan status pembayaran.

---

## ⏳ Yang BELUM Dikerjakan (Pending / Backlog)

Berikut adalah daftar rincian fitur dan perbaikan yang belum dikerjakan, diurutkan berdasarkan skala prioritas:

### 🔴 Prioritas Tinggi (P0 - Critical for Operations)

#### 1. Sistem Autentikasi & Session (Login / Logout)
- [ ] **Halaman Login (`/login`):** Form login untuk Superadmin dan Tenant Owner (Email & Password).
- [ ] **JWT / Session Token:** Endpoint `POST /api/auth/login` dan `POST /api/auth/logout`.
- [ ] **Role-Based Access Control (RBAC):**
  - Superadmin bisa melihat tab Tenants dan memilih outlet mana yang ingin dicek.
  - Tenant Owner hanya bisa melihat data outletnya sendiri dan tidak bisa mengakses menu Superadmin.
- [ ] **Dynamic Tenant Switcher di UI:** Saat ini tenant masih default ke `tenant-01`. Perlu dropdown switcher jika login sebagai Superadmin.

#### 2. Cetak Struk Nota / Thermal Receipt (Print Struk)
- [ ] **Modal Cetak Nota:** Tampilan struk nota format 58mm / 80mm standar printer kasir Bluetooth/USB.
- [ ] **Fitur Print Browser (`window.print()`):** Desain CSS `@media print` khusus struk belanja laundry (nama toko, tanggal, no nota, rincian pakaian, berat/qty, total bayar, status lunas/belum, catatan).
- [ ] **QR Code Nota:** QR Code pada struk untuk mempermudah pengecekan status via smartphone.

#### 3. Aksi Edit & Batalkan Order / Customer
- [ ] **Edit & Hapus Order:** Modal edit jika kasir salah menginput berat/harga, serta tombol pembatalan order (status `cancelled`).
- [ ] **Edit Customer:** Kemampuan memperbarui nomor telepon atau alamat customer yang sudah terdaftar.

---

### 🟡 Prioritas Menengah (P1 - Enhancement & Efficiency)

#### 4. Otomatisasi Pengiriman WhatsApp (Gateway API)
- [ ] Integrasi WhatsApp Gateway pihak ketiga (seperti Fonnte, Wablas, atau Baileys) agar notifikasi dapat terkirim secara **otomatis dari server** tanpa kasir harus mengklik link `wa.me` manual di browser.
- [ ] Log riwayat notifikasi terkirim (Status WA: Terkirim, Gagal, Pending).

#### 5. Manajemen Layanan & Daftar Harga Kustom (Service Pricing)
- [ ] Tabel master data `services` di database:
  - Nama Layanan (contoh: Cuci Kering Setrika, Cuci Basah Saja, Setrika Saja, Bedcover, Sepatu, Karpet).
  - Satuan (`kg`, `pcs`, `meter`, `pasang`).
  - Estimasi waktu pengerjaan (Reguler 2 hari, Kilat 1 hari, Express 4 jam).
  - Harga default per satuan.
- [ ] Dropdown dinamis di form Kasir memilih paket layanan yang otomatis mengisi harga per kg/pcs.

#### 6. Export Laporan Keuangan & Transaksi
- [ ] Export data transaksi order ke format **Excel (.xlsx)** atau **CSV**.
- [ ] Export laporan arus kas bulanan (Pemasukan, Pengeluaran, Laba Bersih) ke format **PDF Ringkasan Laporan**.
- [ ] Filter rentang tanggal (Hari Ini, 7 Hari Terakhir, Bulan Ini, Custom Date Range).

---

### 🟢 Prioritas Rendah (P2 - Long-Term & Nice-to-Have)

#### 7. Manajemen Inventaris Bahan Baku (Stok Deterjen & Pewangi)
- [ ] Tabel `inventory` (Deterjen, Pewangi, Plastik Packing, Hanger, Label Tag).
- [ ] Alert stok menipis jika sisa deterjen/plastik di bawah batas minimum.
- [ ] Otomatis menambahkan pengeluaran (`expenses`) saat kasir mencatat pembelian restock barang.

#### 8. Halaman Cek Resi Mandiri untuk Customer (Public Tracking)
- [ ] Halaman publik tanpa login (misal `/track/:invoiceNo`).
- [ ] Customer cukup scan QR Code di struk atau memasukkan No. Nota untuk melihat progress cucian secara real-time tanpa perlu chat admin.

#### 9. Pengujian & CI/CD
- [ ] Unit test backend (`bun test`) untuk endpoint API.
- [ ] GitHub Actions workflow `.github/workflows/ci.yml` untuk testing otomatis dan validasi build monorepo.
