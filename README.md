# Orchid Brand - Smart Laundry 🧺
### Platform Multi-Tenant SaaS Manajemen Operasional & Kasir Laundry Modern

Platform Multi-Tenant SaaS berbasis **Bun**, dirancang khusus untuk memenuhi kebutuhan nyata bisnis laundry perumahan dan multi-cabang modern. Dibangun dengan arsitektur terpisah yang bersih: **Frontend SPA (Vite + React 18 + TypeScript + Tailwind CSS)** dan **Backend REST API (Bun + Hono.js + Drizzle ORM + PostgreSQL + Baileys WhatsApp Gateway)**.

---

## 🛠️ Tech Stack Unggulan

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Runtime & Toolchain** | **[Bun](https://bun.sh/)** | Package manager kilat, bundler native, dan runtime backend berkinerja tinggi. |
| **Backend REST API** | **[Hono.js](https://hono.dev/)** on Bun | Framework web ultra cepat, modular, type-safe, dengan latensi rata-rata < 20ms. |
| **Database & ORM** | **PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)** | Database relasional standar industri dengan transaksi ACID persisten via Docker. |
| **Frontend Web** | **Vite + React 18 (TypeScript)** | Single Page Application (SPA) responsif dan interaktif di desktop, tablet, & ponsel. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Desain antarmuka modern yang bersih, konsisten, dan berstandar enterprise. |
| **Engine WhatsApp** | **Baileys Gateway & wa.me** | Pengiriman otomatis berbasis server via scan QR akun outlet atau tautan manual. |

---

## 🚀 Fitur Unggulan Sistem

### 1. Engine Notifikasi WhatsApp Cerdas & Terkontrol
- **Hanya Terkirim Saat Siap Diambil:** WhatsApp otomatis **hanya dikirimkan saat status cucian diubah ke Siap Diambil (`ready`)**, mencegah spam pesan yang tidak perlu kepada pelanggan.
- **Pencantuman Jam Buka Outlet Otomatis:** Setiap pesan siap diambil memuat nomor nota, rincian layanan, status pembayaran, nomor rak, serta jam operasional:
  ```text
  ⏰ Jam Buka Outlet:
  • Senin - Jumat : 08.00 - 16.00
  • Sabtu : 08.00 - 13.00
  ```
- **Mode Fleksibel:** Pilihan pengiriman otomatis langsung via server (**Baileys Gateway**) atau manual melalui tautan browser (**wa.me**).

### 2. Manajemen Order Kasir Cepat (POS) & Rak Cucian
- **Pencatatan Cepat & Fleksibel:** Mendukung pesanan kiloan, satuan (Bedcover, Jas, Sepatu, Karpet), multi-layanan, dan pendaftaran pelanggan baru instan (*inline*).
- **Nomor Rak / Keranjang Penyimpanan (`rackNumber`):** Memastikan posisi rak pakaian tercatat di sistem, struk thermal, dan pesan WhatsApp untuk mencegah pakaian tertukar antar pelanggan.
- **Siklus 6 Tahap Status Cucian:** `Antrian (pending)` ➔ `Sedang Dicuci (washing)` ➔ `Pengeringan & Setrika (drying_ironing)` ➔ `Siap Diambil (ready)` ➔ `Selesai Diambil (completed)` / `Dibatalkan (cancelled)`.
- **Koreksi Pesanan Kasir:** Modal `EditOrderModal` untuk koreksi berat, tarif, paket layanan, no. rak, dan catatan.
- **Deteksi "Cucian Menginap" (>3 Hari):** Badge peringatan otomatis untuk mem-follow up cucian yang belum diambil pelanggan lebih dari 3 hari.
- **Pelunasan Cepat (Quick Pay):** Popover 1-klik lunas dengan Tunai (Cash), QRIS, atau Transfer Bank.

### 3. Cetak Struk Kasir Thermal Authentic
- **Pratinjau Kertas Kasir Fisik:** Tampilan struk nota authentic bergaya kertas kasir thermal.
- **Dukungan 2 Ukuran Kertas Standar:** Pilihan ukuran kertas printer **58mm** (Bluetooth saku) dan **80mm** (Desktop POS kasir).
- **QR Code Nota Dinamis:** QR Code otomatis tercetak di kertas struk berbasis nomor nota unik untuk kemudahan pemindaian resi.
- **Informasi Jam Operasional:** Tercetak rapi di bagian bawah struk kasir fisik.
- **Direct Web Print:** Menggunakan CSS `@media print` presisi tanpa header/footer default browser.

### 4. Pembukuan Arus Kas & Laporan Finansial
- **Uang Masuk (Income):** Agregasi otomatis dari seluruh transaksi yang berstatus `Lunas (paid)`.
- **Piutang Pelanggan:** Pelacakan total cucian yang sudah selesai namun belum dibayarkan (`unpaid`).
- **Uang Keluar (Expenses):** Pencatatan biaya operasional toko (listrik, air PAM, gas, gaji, sewa, servis mesin).
- **Laba Bersih Dinamis:** Perhitungan real-time `Total Uang Masuk - Total Pengeluaran`.
- **Ekspor Dokumen:**
  - **Buku Kas CSV (Excel):** Format UTF-8 BOM yang langsung terbaca rapi di Microsoft Excel.
  - **Laporan PDF Resmi:** Dokumen cetak siap tanda tangan ber-kop surat outlet dengan filter rentang tanggal.

### 5. Multi-Tenant Cloud & Dual Dashboard
- **Dashboard Superadmin Pusat (HQ):** Memantau omset agregat jaringan, pertumbuhan cabang, dan status lisensi langganan SaaS.
- **Dashboard Operasional Outlet Cabang:** Fokus pada kasir pengerjaan, rak cucian siap diambil, dan buku kas harian.
- **Inspeksi Cabang Cerdas:** Superadmin dapat berpindah menginspeksi cabang tertentu dengan satu klik dari sidebar switcher.

---

## 📂 Struktur Direktori Proyek

```plaintext
orchidbrand-smart-loundry/
├── backend/                  # REST API Server (Bun + Hono + Drizzle + PostgreSQL)
│   ├── src/
│   │   ├── db/              # Skema Drizzle pg-core, koneksi & migration otomatis
│   │   ├── routes/          # Sub-routing Hono (whatsapp, dll.)
│   │   ├── services/        # Service Baileys WhatsApp Gateway & sessions
│   │   ├── index.ts         # Server Hono utama, API endpoints & logic status
│   │   └── seed.ts          # Seeder data awal saat startup
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Client Web App (Vite + React 18 + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/      # UI Modular
│   │   │   ├── tabs/        # Overview, Orders, Cashflow, Customers, Reports, Tenants, Users
│   │   │   ├── modals/      # CreateOrder, EditOrder, ReceiptModal, CreateExpense, WhatsAppSettings
│   │   │   └── common/      # ShadcnDataTable, Toast, Confirm, Icons
│   │   ├── hooks/           # useLaundryData, useWhatsAppGateway
│   │   ├── utils/           # waLink, subscriptionUtils
│   │   ├── types/           # Type definitions Order, Customer, Tenant, User, dll.
│   │   ├── App.tsx          # Root Orchestrator
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml        # Multi-container Postgres + Backend + Frontend
├── package.json              # Root Bun workspaces (`bun dev`)
├── PRD.md                    # Product Requirements Document v2.0
├── TODO.md                   # Roadmap & Status Fitur
└── README.md
```

---

## 🐳 Menjalankan dengan Docker

### 1. Jalankan Seluruh Stack Aplikasi
Jalankan satu perintah dari root direktori proyek:
```bash
docker compose up --build -d
```

### 2. Akses Aplikasi
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API Health:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 3. Perintah Docker Pendukung
```bash
# Melihat log realtime seluruh service
docker compose logs -f

# Menghentikan container
docker compose down
```

> **Catatan Persistensi**: Data PostgreSQL disimpan pada Docker volume `postgres_data`, dan kredensial WhatsApp disimpan pada `data/wa_sessions`, sehingga data transaksi dan sesi WhatsApp tetap aman.

---

## 💻 Menjalankan Secara Lokal (Development)

Dengan konfigurasi Bun Monorepo Workspaces, cukup **1 perintah dari root direktori** untuk menjalankan Backend API (port 5000) dan Frontend Web (port 5173) sekaligus:

```bash
# 1. Install dependencies
bun install

# 2. Jalankan backend + frontend secara paralel:
bun dev
```

### Perintah Tambahan
```bash
# Menjalankan backend saja
bun run dev:backend

# Menjalankan frontend saja
bun run dev:frontend

# Push perubahan skema database Drizzle
bun run db:push
```

---

## 📑 Dokumentasi Resmi & Roadmap
- 📘 **[Product Requirements Document (PRD v2.0)](file:///c:/KAIRAV/project/orchidbrand-loundy/PRD.md)**: Spesifikasi arsitektur lengkap, alur kasir, aturan WhatsApp, portal tracking publik, dan skema database relasional.
- 📋 **[TODO List & Roadmap](file:///c:/KAIRAV/project/orchidbrand-loundy/TODO.md)**: Status fitur selesai dan prioritas backlog yang siap dikerjakan (P0 Cek Resi Publik, Master Layanan & SLA, Enkripsi Password & JWT).
