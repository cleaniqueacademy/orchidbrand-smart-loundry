# Orchid Brand - Smart Laundry 🧺

Aplikasi manajemen operasional dan keuangan bisnis laundry modern berbasis **Bun**. Dirancang khusus dengan model multi-tenant simpel (1 User = 1 Tenant / Outlet), pencatatan arus kas (uang masuk & keluar), database customer, serta notifikasi WhatsApp otomatis saat cucian selesai.

---

## 🚀 Fitur Utama

### 1. Multi-Tenant Sederhana (1 User = 1 Outlet)
- **Super Admin**: Melihat dan mengelola daftar seluruh User dan Tenant (outlet laundry) mereka.
- **Tenant / Outlet Owner**: Mengelola operasional outlet masing-masing secara terisolasi dan aman.

### 2. Manajemen Order & Customer
- **Data Customer**: Menyimpan riwayat nama, nomor telepon/WhatsApp, dan alamat pelanggan.
- **Siklus Order**:
  - `Antrian / Diterima` ➔ `Sedang Dicuci` ➔ `Proses Pengeringan/Setrika` ➔ `Selesai / Siap Diambil` ➔ `Sudah Diambil`.
- **Tipe Layanan**: Kiloan, satuan, express, dry clean, setrika saja, dll.
- **Status Pembayaran**: Lunas (Cash / Transfer / QRIS) atau Belum Lunas.

### 3. Notifikasi WhatsApp Customer
- Ketika status order diubah menjadi **Selesai / Siap Diambil**, sistem otomatis menyiapkan / mengirimkan notifikasi ke nomor WhatsApp customer.
- Format pesan notifikasi berisi nomor nota, ringkasan cucian, total biaya / status pembayaran, dan ucapan terima kasih.

### 4. Pencatatan Keuangan & Arus Kas (Cashflow)
- **Uang Masuk (Income)**: Otomatis tercatat dari transaksi order laundry yang lunas.
- **Uang Keluar (Expenses)**: Pencatatan pengeluaran operasional outlet:
  - Pembelian sabun deterjen, pewangi / softener, plastik packing, token listrik, air PAM, gaji karyawan, perbaikan mesin, dll.
- **Laporan Keuangan**: Ringkasan omset harian, mingguan, bulanan, total pengeluaran, dan laba bersih (net profit).

---

## 🛠️ Rekomendasi Tech Stack

| Komponen | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Runtime & Package Manager** | **[Bun](https://bun.sh/)** | Eksekusi super cepat, native TypeScript, all-in-one bundler & runner. |
| **Framework Web / App** | **Next.js (App Router)** *atau* **Vite + React + Hono/Elysia** | Fullstack simpel, 1 codebase, routing modular, UI responsif. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Tampilan modern, bersih, fleksibel, responsif mobile & desktop. |
| **Database & ORM** | **SQLite (Native Bun) / PostgreSQL + Drizzle ORM** | Zero-config di awal (file `.sqlite` lokal), sangat cepat, type-safe, mudah migrasi ke cloud. |
| **Notifikasi WhatsApp** | **WhatsApp Web API / Direct Link (`wa.me`) / Gateway** | Fleksibel: dari 1-klik instant WhatsApp chat hingga integrasi gateway (Fonnte/Wablas). |

---

## 📦 Memulai Aplikasi (Getting Started)

### Prasyarat
- [Bun](https://bun.sh/) (v1.1+ telah terpasang)

### 1. Instalasi Dependensi
```bash
bun install
```

### 2. Konfigurasi Lingkungan (`.env`)
Buat file `.env` di direktori utama:
```env
PORT=3000
DATABASE_URL=file:./data/laundry.db
JWT_SECRET=super_secret_key_orchid_brand
```

### 3. Menjalankan Mode Pengembangan
```bash
bun run dev
```
Buka peramban di `http://localhost:3000`.

---

## 📋 Struktur Data Inti (Data Model Overview)

- **User**: `id`, `name`, `email`, `password_hash`, `role` (`superadmin`, `tenant_owner`)
- **Tenant**: `id`, `user_id`, `outlet_name`, `phone`, `address`, `created_at`
- **Customer**: `id`, `tenant_id`, `name`, `phone`, `address`, `notes`
- **Order**: `id`, `tenant_id`, `customer_id`, `invoice_no`, `weight_or_qty`, `service_type`, `total_amount`, `status`, `payment_status`, `completed_at`
- **Expense (Uang Keluar)**: `id`, `tenant_id`, `category` (deterjen, listrik, dll), `amount`, `notes`, `expense_date`

---

## 📄 Lisensi

ISC
