# Catatan Eksekusi Besok — Perbaikan UI Admin, WhatsApp Owner, Lifecycle Tagihan, & QRIS Saurus

Tanggal rencana: 25 November 2026 (untuk eksekusi 26 November 2026)  
Referensi istilah: `GLOSSARY.md` · Dasar keputusan: sesi `/grill-with-docs` (Q1–Q5 disetujui penuh)

---

## Ringkasan Temuan & Keputusan

| Area | Temuan dari Audit Kode & Server Live (`indotech`) | Keputusan yang Disetujui |
|---|---|---|
| **1. UI Admin (`Arus Kas & Rekap Langganan`)** | a) Kolom `Outlet & Pemilik` selalu tampil `-` karena `SubscriptionInvoicesTab.tsx` membaca `inv.ownerName`, padahal backend (`routes/subscription.ts`) mengirim `userName` & `userEmail`.<br>b) 5 invoice lama `review_required` (tanpa `expiresAt`) merender 5 banner kuning besar bertumpuk di atas halaman tanpa tombol aksi langsung. | Ringkas tumpukan banner kuning menjadi **1 banner ringkasan** (dengan filter cepat ke tab *Perlu Review* dan opsi expand), tampilkan `userName` + `userEmail`, dan rapikan tombol aksi pada baris tabel (termasuk aksi langsung untuk `review_required`: Verifikasi jika bukti valid, beri jendela bayar baru 24 jam, atau Batalkan). |
| **2. Koneksi WhatsApp Owner (`Baileys`)** | Ditemukan **bug deadlock** di `backend/src/services/whatsapp.ts` (`lines 128 & 248`) yang terkonfirmasi di log `indotech`: setelah scan QR, WhatsApp menutup koneksi pairing dengan `Code: 515` (*restartRequired*), handler set `status = "connecting"` lalu memanggil `initWhatsAppSession(tenantId)` tanpa `forceRefresh`, sehingga terblokir guard `if (!forceRefresh && session.status === "connecting") return` → macet selamanya di *"Menghubungkan ke WhatsApp..."*. | Perbaiki reconnect internal dengan `forceReconnect` (jeda ~500 ms khusus untuk `Code: 515`), tambahkan **timeout koneksi 45 detik** agar status kembali ke `"disconnected"` dengan pesan `lastError` yang jelas bila gagal, dan tambahkan tombol **"Batalkan / Reset Koneksi WA"** di `WhatsAppSettingsModal.tsx` saat status `"connecting"`. |
| **3. Batas Waktu & Pembatalan (`Menunggu Verifikasi`)** | Di `SubscriptionPaymentPanel.tsx` & `invoiceLifecycle.ts`, countdown 24 jam hilang setelah Owner upload bukti (`pending_verification`), Owner ditolak membatalkan jika `paymentProofUrl` sudah ada, dan invoice lama (21 Nov) memiliki `expiresAt = null`. | Pisahkan **Batas Pembayaran** (24 jam sebelum bayar) vs **Estimasi Pemeriksaan Admin** (target 1×24 jam setelah bukti dikirim, tidak auto-hangus). **Izinkan Owner membatalkan** tagihan `pending_verification` selama Admin belum memverifikasi atau mencatat penerimaan dana (`manual_payment_receipts` / `paid`), dengan jejak audit tetap tersimpan. |
| **4. Form "Catat Penerimaan Dana" di Admin** | Tombol `Catat dana masuk` tampil di semua status (termasuk `Lunas`), membuka form inline besar di atas tabel dengan placeholder teknis `BANK:RRN123456` dan input waktu kosong, sehingga membingungkan dibanding tombol `Verifikasi`. | Pindahkan ke **Modal Dialog** terpisah, tampilkan sebagai aksi sekunder (**"Catat Mutasi / Koreksi"**) khusus untuk kasus pengecualian (`unpaid`, `expired`, `cancelled`, `review_required`, atau pembayaran ganda pada `paid` — tidak tampil pada alur normal `Menunggu Verifikasi` agar admin fokus memakai tombol **`Verifikasi`**), isi default **`Waktu pembayaran (WIB)` = waktu sekarang**, dan perjelas label/placeholder. |
| **5. Status & Setting QRIS Saurus** | **QRIS Saurus (`qris-saurus@1.1.0`) sudah aktif** di backend (`qrisPayload.ts` & `subscriptionQris.ts`). Tidak ada setting terpisah karena ia otomatis membaca gambar QRIS statis platform (`/qris.png`) di *Setting Platform*. Di Gambar 3 QR tidak muncul karena status invoice sudah `pending_verification`. Namun `PlatformSettingsTab.tsx` masih memuat label lama `"Google Drive / URL Gambar"`. | Bersihkan teks label Google Drive/URL eksternal yang menyesatkan di `PlatformSettingsTab.tsx`, dan tambahkan **indikator status QRIS Saurus tervalidasi** (menampilkan nama merchant & mata uang IDR hasil baca gambar QRIS aktif saat ini). |

---

## Rincian Eksekusi Besok (Per Modul)

### A. Backend
1. **WhatsApp Reconnect & Timeout** — `backend/src/services/whatsapp.ts`
   - Tambahkan parameter internal `forceReconnect` (atau bedakan antara klik manual `connecting` vs pemanggilan dari timer reconnect / `DisconnectReason.restartRequired`).
   - Tangani `statusCode === DisconnectReason.restartRequired` (`515`) dengan reconnect cepat (`500 ms`) tanpa meningkatkan `reconnectAttempts` sebagai kegagalan.
   - Tambahkan connection watchdog timeout (45 detik) jika tetap di `"connecting"` tanpa menerima QR maupun `open`: tutup socket, set `status = "disconnected"`, dan isi `lastError` yang informatif.
   - Tambahkan unit test (mock socket / state transition) untuk memastikan `515 restartRequired` tidak deadlock dan timeout mengembalikan status ke `"disconnected"`.
2. **Lifecycle Pembatalan & Invoice Lama** — `backend/src/services/invoiceLifecycle.ts`, `backend/src/routes/subscription.ts`
   - Pada `cancelSubscriptionInvoice`: izinkan `tenant_owner` membatalkan tagihan berstatus `unpaid`, `rejected`, **dan** `pending_verification` selama belum `paid`, belum ada `paymentAttempts` aktif/paid, dan belum ada `manualPaymentReceipts` yang tercatat. Simpan bukti audit yang sudah terunggah di `stored_files` tanpa dihapus.
   - Untuk invoice `review_required` akibat `legacy_expiry_missing` yang sudah punya bukti (`paymentProofUrl`), pastikan admin dapat meninjau atau memberi batas waktu baru 24 jam / memverifikasi / membatalkan dengan bersih.
   - Periksa endpoint `GET /api/platform-settings` (atau endpoint info QRIS admin) agar mengembalikan ringkasan metadata QRIS Saurus aktif (`merchantName`, `merchantCity`, `currency`, `valid`) menggunakan `loadPlatformQris` / parser `qrisPayload.ts` tanpa error bila belum diset.

### B. Frontend
3. **UI Admin Verifikasi Tagihan** — `frontend/src/components/tabs/admin/SubscriptionInvoicesTab.tsx`, `frontend/src/types/index.ts`
   - Tambahkan `userName?: string | null; userEmail?: string | null;` pada tipe `SubscriptionInvoice` dan tampilkan di kolom `Outlet & Pemilik` (`inv.userName || inv.ownerName || "-"` + email).
   - Ganti loop banner kuning per-invoice menjadi **1 banner ringkas** (*"N tagihan memerlukan review/tindakan admin"*) dengan tombol menuju tab `Perlu Review` dan tombol expand opsional.
   - Tambahkan tombol aksi yang jelas pada baris `review_required` (bila ada bukti transfer: Verifikasi / Tolak / Batalkan; bila belum ada bukti: Batalkan / Beri jendela bayar baru bila relevan).
   - Ubah **"Catat penerimaan dana"** menjadi **Modal Dialog** rapi; tampilkan tombolnya sebagai aksi sekunder **"Catat Mutasi / Koreksi"** hanya pada status yang relevan (bukan menggantikan tombol utama **`Verifikasi`** pada `pending_verification`), isi default `receiptTime` dengan waktu WIB sekarang (`YYYY-MM-DDTHH:mm`), dan perjelas placeholder referensi bank/merchant.
4. **Panel Pembayaran Owner** — `frontend/src/components/tabs/subscription/SubscriptionPaymentPanel.tsx`, `frontend/src/components/tabs/subscription/SubscriptionTab.tsx`
   - Tampilkan informasi waktu pada `pending_verification`: kapan bukti diunggah + **Estimasi pemeriksaan admin: maksimal 1×24 jam** (serta keterangan jelas untuk invoice legacy tanpa `expiresAt`).
   - Tampilkan tombol **`Batalkan tagihan ini`** pada status `pending_verification` (selama belum `paid`) dengan dialog konfirmasi yang jelas bahwa pembatalan berlaku bila belum diverifikasi/belum ada mutasi tercatat.
5. **UI Koneksi WhatsApp Owner** — `frontend/src/components/modals/WhatsAppSettingsModal.tsx`, `frontend/src/hooks/useWhatsAppGateway.ts`
   - Pada state `waData.status === "connecting"`: tampilkan pesan status + tombol **"Batalkan / Muat Ulang Koneksi"** (memanggil `onDisconnect` atau `onConnect(true)`).
   - Tampilkan `waData.lastError` di layar `"disconnected"` / `"connecting"` jika koneksi sebelumnya gagal agar Owner tidak menebak-nebak.
   - Tambahkan timeout loading di `connectWA` pada `useWhatsAppGateway.ts` agar tombol tidak macet jika jaringan lambat.
6. **Setting Platform QRIS Saurus** — `frontend/src/components/tabs/admin/PlatformSettingsTab.tsx`
   - Ganti label `"Tautan QRIS Platform (Google Drive / URL Gambar)"` menjadi `"Gambar QRIS Statis Platform (untuk QRIS Saurus)"` dan hilangkan teks pendukung Google Drive/URL eksternal yang sudah tidak berlaku.
   - Tampilkan badge status validasi QRIS Saurus (`Merchant: ... · IDR · Siap generate QR nominal`).

### C. Verifikasi & Deploy
7. **Verifikasi Lokal & CI**:
   - Jalankan `bun run --cwd backend typecheck`, `bun run --cwd backend build`, `bun run --cwd frontend build`, dan seluruh unit + integration test PostgreSQL terisolasi (termasuk test baru untuk `515 restartRequired` WA, pembatalan `pending_verification` oleh Owner, dan metadata QRIS admin).
8. **Deploy Aman ke `indotech`**:
   - Backup DB (`pg_dump`) + volume sebelum pull & `docker compose -f docker-compose.prod.yml up -d --build`, lalu cek healthcheck, login admin & owner, test koneksi WA, dan pastikan `users/tenants/orders/invoices` utuh 100%.
