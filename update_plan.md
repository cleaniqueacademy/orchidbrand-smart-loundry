# Rencana Pembaruan Sistem: Analisa Kesehatan Bisnis, Skema Pengeluaran Fleksibel & Chatbot AI Role-Based
**Proyek:** Laundry Cleanique (Multi-Tenant Smart Laundry POS & Platform)  
**Dokumen:** `update_plan.md`  
**Status:** Disetujui (Siap Dikerjakan)  
**Filosofi Utama:** *Zero Configuration — Pengguna baru langsung pakai tanpa perlu setting awal, cerdas mendeteksi cucian, fleksibel jika ingin custom.*

---

## 1. Kesepakatan Desain & Prinsip Kerja (Hasil Diskusi)

1. **Zero Configuration (Langsung Pakai):**
   - Begitu outlet mendaftar atau login, **semua skema default pengeluaran dan takaran SOP deterjen/gas/parfum sudah terpasang otomatis**.
   - User tidak diwajibkan melakukan konfigurasi awal apa pun.
2. **Kategori Pengeluaran Default + Tetap Bisa Custom:**
   - Menyediakan kategori default standar bisnis laundry: *Deterjen & Kimia*, *Parfum*, *Gas LPG*, *Listrik & Air*, *Plastik Packing*, *Sewa Ruko*, *Gaji Karyawan*, *Langganan Aplikasi*, *Servis Mesin*, dan *Lain-lain*.
   - Pemilik outlet tetap bisa menambah kategori custom baru kapan saja jika ada kebutuhan khusus.
3. **Deteksi Otomatis Cucian Kiloan (Opsi 1):**
   - Perhitungan matematis deterjen, parfum, dan gas fokus otomatis pada seluruh pesanan kiloan yang mengandung proses cuci (misal "Cuci Komplit", "Cuci Kering", dll).
   - Layanan non-cuci (misal "Setrika Saja" atau "Dry Clean Sepatu") otomatis tidak membebani hitungan deterjen.
4. **Trace Sewa Tempat & Beban Langganan (Tanpa Mengotori Database):**
   - Transaksi sewa dicatat **1 baris saja** di buku kas (arus kas fisik keluar riil).
   - Sistem yang membagi beban bulanan (`Total ÷ Durasi Bulan`) secara matematis di laporan kesehatan bisnis.
   - Perpanjangan langganan (55k/60k) otomatis masuk 1 baris ke tabel `expenses` saat status invoice menjadi `paid`.
5. **Chatbot AI Berbasis Role:**
   - **Pemilik (`tenant_owner`):** Memiliki akses penuh konsultasi finansial (omset, biaya deterjen, laba bersih riil, masa sewa, dan deteksi pemborosan).
   - **Kasir (`staff`):** Tetap diproteksi ketat RBAC (hanya bantuan operasional meja kasir, panduan noda, shift, dan cari order).

---

## 2. Alur Pengeluaran & Rumus Perhitungan Cerdas

### A. Parameter Default Takaran SOP Bahan (Bawaan Sistem)
*Perhitungan otomatis dari total Kg cucian yang selesai/diproses:*
- **Deterjen Cair:** `25 ml / kg cucian` (Acuan harga rata-rata: Rp 15.000 / Liter = `Rp 375 / kg`).
- **Parfum Laundry:** `12 ml / kg cucian` (Acuan harga rata-rata: Rp 35.000 / Liter = `Rp 420 / kg`).
- **Gas Pengering (LPG):** Acuan standar `Rp 400 / kg cucian`.
- **Plastik Packing:** Acuan standar `Rp 200 / kg cucian`.

> **Logika Deteksi Pemborosan (Alert Kebocoran):**
> - **Total Cucian Bulan Ini:** misal `1.000 Kg`.
> - **Estimasi Kebutuhan Deterjen:** `1.000 Kg × Rp 375 = Rp 375.000` (atau 25 Liter).
> - **Realisasi Belanja Deterjen di Buku Kas:** misal `Rp 750.000`.
> - **Status:** ⚠️ *Boros Takaran (100% di atas estimasi wajar). Sistem memberi peringatan untuk mengecek takaran pegawai.*

---

### B. Pelacakan Sewa Ruko (*Rent Tracking*)
- **Input Form Pengeluaran:**
  - Kategori: *Sewa Ruko / Tempat*.
  - Tambahan input opsional: **Durasi (Bulan)** (misal 12 bulan) & **Tanggal Mulai**.
- **Perlakuan Sistem:**
  - Di Buku Kas: Tercatat 1 transaksi riil (misal Rp 12.000.000).
  - Di Laporan Bulanan: Beban diamortisasi `Rp 1.000.000 / bulan`.
  - Di Dashboard: Menampilkan *widget countdown* sisa masa sewa (misal: *Tersisa 5 bulan lagi s/d 31 Agustus 2026*).

---

### C. Auto-Expense Perpanjangan Aplikasi
- Ketika invoice langganan (`subscription_invoices`) diverifikasi oleh Superadmin (status berubah menjadi `paid`):
- Backend otomatis menyisipkan 1 record ke tabel `expenses`:
  - `tenantId`: ID outlet
  - `type`: `expense`
  - `category`: `Langganan Aplikasi`
  - `amount`: sesuai tagihan (misal Rp 55.000 / Rp 60.000)
  - `notes`: `Perpanjangan lisensi Laundry Cleanique (Inv: [INVOICE_NO])`
  - `expenseDate`: tanggal invoice dibayar/diverifikasi

---

## 3. UI/UX: Sub-Tab "Kesehatan Bisnis" di Menu Laporan

Terletak di dalam menu **Laporan** (`ReportsTab.tsx`):

```
+---------------------------------------------------------------------------------+
|  MENU LAPORAN OUTLET                                                            |
|  [Rekap Finansial]   [Buku Besar (Ledger)]   [★ Kesehatan Bisnis]               |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  RINGKASAN KESEHATAN OUTLET                                                     |
|  Skor: 🟢 88 / 100 (Sangat Sehat & Menguntungkan)                               |
|                                                                                 |
|  +------------------------+  +------------------------+  +-------------------+  |
|  | MARGIN LABA BERSIH     |  | RASIO HPP BAHAN KIMIA  |  | PIUTANG CUCIAN    |  |
|  | 41.2% (Sehat > 35%)   |  | 14.1% (Ideal 10-18%)   |  | 3.8% dari Omset   |  |
|  | Untung Bersih: 3.8 jt  |  | Belanja: Rp 1.300.000  |  | Belum Lunas: 2    |  |
|  +------------------------+  +------------------------+  +-------------------+  |
|                                                                                 |
|  AUDIT EFISIENSI BAHAN BULAN INI (Total Cuci Kiloan: 980 Kg)                    |
|  +---------------------+-------------------+------------------+---------------+  |
|  | Bahan Operasional   | Estimasi SOP      | Realisasi Belanja| Indikator     |  |
|  +---------------------+-------------------+------------------+---------------+  |
|  | Deterjen Cair       | 24.5 L (Rp 367k)  | Rp 400.000       | 🟢 Efisien    |  |
|  | Parfum & Pelicin    | 11.7 L (Rp 411k)  | Rp 450.000       | 🟢 Efisien    |  |
|  | Gas Pengering (LPG) | Est. Rp 392.000   | Rp 550.000       | 🟡 Perhatian  |  |
|  | Plastik Packing     | Est. Rp 196.000   | Rp 200.000       | 🟢 Efisien    |  |
|  +---------------------+-------------------+------------------+---------------+  |
|                                                                                 |
|  STATUS SEWA TEMPAT & RUNWAY KAS                                                |
|  • Sewa Ruko: Sisa 5 Bulan lagi (Jatuh tempo: 31 Agustus 2026)                  |
|  • Amortisasi Sewa: Rp 1.000.000 / bulan dimasukkan dalam hitungan beban riil.  |
|                                                                                 |
|  INSIGHT & SARAN BISNIS OTOMATIS:                                               |
|  💡 "Gas Pengering 40% lebih tinggi dari estimasi wajar. Periksa apakah mesin   |
|      pengering dioperasikan saat cucian belum diperas maksimal di mesin cuci."  |
+---------------------------------------------------------------------------------+
```

---

## 4. Chatbot AI Berbasis Role (Peningkatan Konteks)

### Untuk Pemilik Outlet (`tenant_owner`):
Backend `contextService.ts` menyuplai data menyeluruh:
- Total omset bulan ini dan laba bersih riil (setelah dikurangi beban operasional & sewa).
- Total kg cucian yang telah diproses.
- Ringkasan belanja deterjen/parfum/gas vs estimasi standar.
- Status sisa masa sewa tempat & masa aktif paket aplikasi.

**Contoh Pertanyaan yang Bisa Dijawab AI:**
- *"Berapa estimasi deterjen yang terpakai bulan ini?"*
- *"Apakah pengeluaran laundry saya bulan ini wajar?"*
- *"Berapa sisa masa sewa ruko saya?"*
- *"Di mana letak pemborosan terbesar saya bulan ini?"*

### Untuk Staf Kasir (`staff`):
- Tetap dijaga ketat oleh [rbacGuard.ts](file:///c:/KAIRAV/project/orchidbrand-loundy/backend/src/services/ai/rbacGuard.ts).
- Jika kasir bertanya omset, laba, sewa, atau pengeluaran, AI menolak ramah sesuai batasan wewenang kasir.

---

## 5. Rencana Perubahan Database & Backend

1. **Tabel `expenses` di [schema.ts](file:///c:/KAIRAV/project/orchidbrand-loundy/backend/src/db/schema.ts):**
   - `rentDurationMonths`: doublePrecision (durasi bulan jika pengeluaran sewa)
   - `rentStartDate`: text (tanggal mulai sewa)
   - `isAutoGenerated`: text ("true" jika dibuat otomatis dari pembayaran langganan)
2. **Tabel `tenants` di [schema.ts](file:///c:/KAIRAV/project/orchidbrand-loundy/backend/src/db/schema.ts):**
   - `customExpenseCategories`: text (JSON array string untuk kategori tambahan buatan outlet)
   - `customSopRatios`: text (JSON string jika outlet mengubah takaran default; jika kosong pakai default bawaan sistem)
3. **`subscriptionService.ts`:**
   - Tambahkan fungsi auto-insert expense saat invoice langganan berstatus `paid`.
4. **`contextService.ts`:**
   - Lengkapi agregasi data bulanan untuk pemilik outlet agar AI dapat menjawab pertanyaan seputar finansial dan deterjen.

---

## 6. Tahapan Eksekusi

| Langkah | Rincian Pekerjaan |
| :---: | :--- |
| **Langkah 1** | Update skema database Drizzle (`schema.ts`) & migrate skema baru. |
| **Langkah 2** | Implementasi auto-expense perpanjangan langganan di `subscriptionService.ts`. |
| **Langkah 3** | Buat logika utilitas kalkulator efisiensi deterjen & rasio kesehatan bisnis. |
| **Langkah 4** | Integrasikan data finansial ke `contextService.ts` untuk AI Chatbot (khusus role `tenant_owner`). |
| **Langkah 5** | Pembuatan UI Sub-Tab "Kesehatan Bisnis" di `ReportsTab` dan form sewa di `CashflowTab`. |
| **Langkah 6** | Testing menyeluruh (Unit Test & Verifikasi Browser). |
| **Langkah 7** | Implementasi Thermal Printer Connection di Pengaturan (`SettingsTab.tsx`) dan validasi status terhubung di Kasir (`ReceiptModal.tsx`). |

