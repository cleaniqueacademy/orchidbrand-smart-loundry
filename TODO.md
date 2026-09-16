# Project Roadmap & TODO List
# Orchid Brand Smart Laundry

Dokumen ini memetakan status pengerjaan fitur yang **SUDAH SELESAI (Completed)** dan apa saja yang **BELUM DIKERJAKAN (Pending / Backlog)**.

---

## 📊 Ringkasan Status

- **Status Dasar & Setup Monorepo:** 100% Selesai
- **Core Dashboard & Operasional Kasir:** 100% Selesai (termasuk Edit, Batal, & Hapus Pesanan)
- **Cetak Struk Nota Kasir Thermal:** 100% Selesai (58mm/80mm + QR Code)
- **Fitur Kritis Laundry Perumahan:** 100% Selesai (No. Rak, Cucian Menginap, Quick Pay, WA Cerdas)
- **Sistem Arus Kas & Laporan Keuangan:** 100% Selesai (Buku Kas, Export CSV Excel, & PDF Cetak)
- **Multi-Tenant & Notifikasi WA:** 100% Selesai (Konsolidasi HQ & Cabang + Format WA Otomatis)
- **Autentikasi & Keamanan:** 100% Selesai (Login, Logout, Validasi Sesi, & Role RBAC)
- **Fitur Lanjutan (Gateway WA Otomatis, Stok Barang, Public Tracking, CI):** 0% (Pending P1 & P2)

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
  - `orders` (transaksi cucian, berat/qty, status proses, status pembayaran, nota invoice, nomor rak)
  - `expenses` (pencatatan uang keluar operasional)
- [x] Auto-seed data demo saat startup pertama (`seed.ts`).
- [x] Auto-migration skema database terintegrasi (`initPostgresTables`).
- [x] REST API CRUD lengkap:
  - `GET /api/health`
  - `POST /api/auth/login` (validasi email, password, status akun, dan tanggal langganan)
  - `POST /api/auth/logout`
  - `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`, `DELETE /api/users/:id`
  - `GET /api/tenants`, `POST /api/tenants`, `PUT /api/tenants/:id`, `PATCH /api/tenants/:id/status`, `DELETE /api/tenants/:id`
  - `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id`, `DELETE /api/customers/:id`
  - `GET /api/orders`, `POST /api/orders`, `PUT /api/orders/:id`, `DELETE /api/orders/:id`
  - `PATCH /api/orders/:id/status` (mendukung status `cancelled`, generator URL WhatsApp dinamis dan lokasi rak)
  - `PATCH /api/orders/:id/payment` (update lunas/belum lunas dan metode bayar cash/qris/transfer)
  - `GET /api/expenses`, `POST /api/expenses`, `DELETE /api/expenses/:id`
  - `GET /api/stats/cashflow` (kalkulasi omset lunas, piutang, total pengeluaran, laba bersih — mengabaikan transaksi batal)

### 3. Frontend Dashboard Admin & Kasir (React + Vite + Tailwind CSS)
- [x] **Sistem Autentikasi & Session (Prioritas P0 Selesai):**
  - Halaman Login (`LoginPage.tsx`) dengan validasi email & kata sandi.
  - Sesi tersimpan di `localStorage` dengan penanganan status akun aktif/nonaktif & kedaluwarsa langganan.
  - Tombol Logout di Header dan Sidebar yang membersihkan sesi dan memanggil API backend.
  - **Role-Based Access Control (RBAC):** Menu Superadmin (*Semua Cabang* & *Manajemen User*) terkunci dari Tenant Owner biasa.
  - **Dynamic Tenant Switcher:** Dropdown di sidebar untuk Superadmin berganti antara Konsolidasi HQ dan inspeksi outlet cabang.
- [x] **Cetak Struk Nota / Thermal Receipt (Prioritas P0 Selesai):**
  - Modal cetak struk nota kasir (`ReceiptModal.tsx`) bergaya kertas thermal otentik.
  - Pilihan ukuran kertas thermal: **58mm** (printer saku Bluetooth) dan **80mm** (printer kasir POS meja).
  - Integrasi **QR Code Nota** dinamis berbasis invoice untuk kemudahan scan.
  - Tombol cetak langsung browser (`window.print()`) dengan `@media print` presisi tanpa margin berlebih.
  - Fitur salin teks ringkasan nota ke clipboard.
  - Tombol **Kirim WA** langsung dari pratinjau struk kasir.
- [x] **Aksi Edit, Batal, & Hapus Pesanan (Prioritas P0 Selesai):**
  - Modal edit pesanan kasir (`EditOrderModal.tsx`) untuk koreksi berat/qty cucian, tarif per satuan, total bayar, paket layanan, no. rak, dan catatan.
  - Tombol Batalkan Pesanan (status `cancelled`) dengan dialog konfirmasi aman.
  - Tombol Hapus Pesanan permanen (`DELETE`) untuk pesanan yang sudah dibatalkan atau salah input.
  - Modal edit pelanggan (`EditCustomerModal.tsx`) dan hapus data pelanggan.
- [x] **Pembuatan Pelanggan Instan (Inline Rapid Customer):**
  - Form Order Baru (`CreateOrderModal.tsx`) mendukung pendaftaran pelanggan baru langsung di modal yang sama tanpa perlu bolak-balik ke tab Pelanggan.
- [x] **Fitur Kritis Khusus Laundry Perumahan / Rumahan:**
  - **Nomor Rak / Keranjang Penyimpanan (`rackNumber`):** Mencegah pakaian tertukar antar tetangga, tersimpan di DB, tabel kasir, struk thermal, dan notifikasi WA.
  - **Pesan WhatsApp Cerdas Sesuai Konteks:** Format pesan otomatis menyesuaikan status (Cucian Diterima, Siap Diambil, Pengingat Menginap, Selesai, Dibatalkan).
  - **Deteksi & Filter "Cucian Menginap" (>3 Hari Belum Diambil):** Badge peringatan dan filter cepat untuk kasir mem-follow-up pakaian tetangga yang menumpuk di rak.
  - **Pelunasan Cepat Kasir (Quick Payment Popover):** Pilihan metode bayar 1-klik (Tunai, QRIS, Transfer) langsung dari baris tabel pesanan.
- [x] **Laporan & Pembukuan Keuangan (Reports Tab):**
  - Unduh buku besar transaksi format **CSV (UTF-8 BOM)** langsung kompatibel dengan Microsoft Excel.
  - Cetak dokumen resmi ber-kop surat outlet ke format **PDF**.
  - Filter rentang waktu (*Date Range Picker*) dan ringkasan kontribusi layanan & biaya.
- [x] **Pemisahan Dashboard Super Admin & Tenant Owner (Prioritas P0 Selesai):**
  - **Dashboard Eksekutif Pusat HQ (`AdminOverviewTab.tsx`):** Menampilkan metrik SaaS multi-cabang (Omset Konsolidasi, Jaringan Cabang, Akun & Lisensi SaaS, Total Pesanan Jaringan), Papan Peringkat & Performa Outlet, dan Feed Pesanan Lintas Cabang.
  - **Dashboard Operasional Kasir Cabang (`TenantOverviewTab.tsx`):** Fokus operasional kasir cabang (Order Baru POS, Catat Biaya, Rak & Cucian Siap Diambil, Notifikasi WhatsApp, dan Buku Kas Outlet).
  - **Mode Inspeksi Cabang Cerdas:** Jika Super Admin menginspeksi cabang tertentu, dashboard cabang menampilkan banner navigasi kuning dengan tombol *← Kembali ke Dashboard Pusat (HQ)*.
  - **Kepatuhan Modularitas:** Seluruh file view dan composable dipecah rapi di bawah batas 800 baris kode.
- [x] **Navigasi Tab Operasional Lengkap:**
  - **Overview:** Router cerdas antara Dashboard Pusat (Superadmin) dan Dashboard Outlet (Tenant Owner).
  - **Orders:** Kasir laundry modern dengan tabel data terfilter, update status cepat, cetak struk thermal, dan edit pesanan.
  - **Cashflow:** Buku arus kas harian dan modal catat biaya operasional.
  - **Customers:** Direktori pelanggan dengan histori dan tombol direct WhatsApp.
  - **Tenants:** Manajemen cabang outlet.
  - **Users:** Manajemen akun pengguna, hak akses, dan lisensi langganan.

---

## ⏳ Yang BELUM Dikerjakan (Pending / Backlog)

Berikut adalah daftar backlog fitur yang tersisa untuk fase berikutnya:

### 🟡 Prioritas Menengah (P1 - Enhancement & Efficiency)

#### 1. Otomatisasi Pengiriman WhatsApp (Gateway API)
- [ ] Integrasi WhatsApp Gateway pihak ketiga (seperti Fonnte, Wablas, atau Baileys) agar notifikasi dapat terkirim secara **otomatis dari server** tanpa kasir harus mengklik link `wa.me` manual di browser.
- [ ] Log riwayat notifikasi terkirim (Status WA: Terkirim, Gagal, Pending).

#### 2. Manajemen Layanan & Daftar Harga Kustom (Service Pricing)
- [ ] Tabel master data `services` di database:
  - Nama Layanan (contoh: Cuci Kering Setrika, Cuci Basah Saja, Setrika Saja, Bedcover, Sepatu, Karpet).
  - Satuan (`kg`, `pcs`, `meter`, `pasang`).
  - Estimasi waktu pengerjaan (Reguler 2 hari, Kilat 1 hari, Express 4 jam).
  - Harga default per satuan.
- [ ] Dropdown dinamis di form Kasir memilih paket layanan yang otomatis mengambil dari master data DB.

---

### 🟢 Prioritas Rendah (P2 - Long-Term & Nice-to-Have)

#### 3. Manajemen Inventaris Bahan Baku (Stok Deterjen & Pewangi)
- [ ] Tabel `inventory` (Deterjen, Pewangi, Plastik Packing, Hanger, Label Tag).
- [ ] Alert stok menipis jika sisa deterjen/plastik di bawah batas minimum.
- [ ] Otomatis menambahkan pengeluaran (`expenses`) saat kasir mencatat pembelian restock barang.

#### 4. Halaman Cek Resi Mandiri untuk Customer (Public Tracking)
- [ ] Halaman publik tanpa login (misal `/track/:invoiceNo`).
- [ ] Customer cukup scan QR Code di struk atau memasukkan No. Nota untuk melihat progress cucian secara real-time tanpa perlu chat admin.

#### 5. Pengujian & CI/CD
- [ ] Unit test backend (`bun test`) untuk endpoint API.
- [ ] GitHub Actions workflow `.github/workflows/ci.yml` untuk testing otomatis dan validasi build monorepo.
