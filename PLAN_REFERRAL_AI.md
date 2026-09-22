# Rencana Kerja (Plan & TODO)
# Modul Referral Marketing, Registrasi Mandiri, Langganan Berbayar & Asisten AI
## Orchid Brand Smart Laundry v2.0

- **Versi Dokumen:** 1.0.0
- **Status:** DRAFT — Menunggu Persetujuan
- **Basis Kode:** `orchidbrand-smart-loundry` (commit saat ini)
- **Stack Aktual:** Bun + Hono + Drizzle ORM + PostgreSQL (backend), React 18 + Vite + Tailwind + Framer Motion (frontend), Baileys WA Gateway (multi-session per tenant)

---

## 1. Ringkasan Tujuan

Menambah 3 kelompok kemampuan besar pada platform yang **belum ada sama sekali** saat ini:

| # | Kelompok Fitur | Inti Kebutuhan Bisnis |
|---|---|---|
| **A** | **Referral & Marketing** | Admin membuat banyak kode referral; tiap kode mewakili 1 orang Admin Marketing; kode bisa diaktifkan/nonaktifkan per tenant; penjualan lewat kode teratribusi ke marketing tersebut. |
| **B** | **Registrasi Mandiri & Langganan** | Calon tenant daftar sendiri lewat link publik; otomatis dapat **free trial 7 hari**; setelah trial harus bayar **harga bulanan** yang **diatur admin**; link bisa memuat parameter kode referral (`?ref=KODE`); tanpa parameter → tenant tetap dapat 7 hari akses namun membayar **harga normal**. |
| **C** | **Asisten AI (3 Kanal)** | (1) AI in-web: halaman chat AI setelah login. (2) AI di chat WhatsApp admin: pesan masuk ke nomor WA yang tersambung dibalas AI. (3) Panel admin untuk **cloning nomor WA** sekaligus **menyalakan/mematikan bot** per nomor. |

---

## 2. Audit Sistem Saat Ini (Fakta dari Kode)

Bagian ini penting agar rencana tidak salah landasan. Semua poin di bawah **terverifikasi** dari `backend/src/index.ts`, `backend/src/db/schema.ts`, `backend/src/routes/whatsapp.ts`, `backend/src/services/whatsapp.ts`, dan `frontend/src/App.tsx`.

### 2.1 Yang SUDAH ada dan bisa dipakai ulang
- **Multi-tenant dasar**: tabel `tenants` (punya `userId` owner, `status`, `subscriptionUntil`, `waMode`, `services`, `openingHours`, data rekening bank).
- **RBAC 3 peran**: `superadmin` | `tenant_owner` | `staff` (kolom `users.role`).
- **Langganan berbasis tanggal**: `users.subscriptionUntil` & `tenants.subscriptionUntil`; login ditolak dengan kode `SUBSCRIPTION_EXPIRED` / `ACCOUNT_INACTIVE`.
- **Endpoint perpanjangan langganan**: `POST /api/users/:id/extend` (tambah hari / set tanggal) — **sudah ada**, tinggal dihubungkan ke alur pembayaran.
- **WhatsApp Gateway Baileys multi-session**: `initWhatsAppSession(tenantId)`, `disconnectWhatsApp`, `sendWhatsAppMessage`, `autoRestoreSavedSessions`, `getWhatsAppStatus` — session per tenant tersimpan di disk.
- **Pencatatan log WA**: tabel `wa_logs` + `POST /api/whatsapp/log`.
- **POS, layanan/SLA, shift kasir, arus kas, laporan CSV/PDF, halaman tracking publik** — semua sudah jalan.
- **Pola frontend**: tab-based (`TabType`) + route manual di `App.tsx` (`/track/:invoiceNo`), context `ToastContext`/`ConfirmContext`, komponen modal terpusat di `AppModals.tsx`.

### 2.2 Celah / hal yang HARUS dibangun dari nol
| Celah | Dampak |
|---|---|
| **Tidak ada tabel referral apa pun** | Seluruh kelompok fitur A harus dibuat baru. |
| **Tidak ada tabel harga/plan** | Harga bulanan tidak tersimpan; hardcode di logika. |
| **Tidak ada endpoint registrasi publik** | `POST /api/tenants` hanya bisa dipanggil superadmin dan wajib isi banyak field; belum ada alur self-service. |
| **Tidak ada payment gateway** | Belum ada Midtrans/Xendit/Stripe. Perlu jalur manual (konfirmasi transfer) dulu, gateway di fase berikutnya. |
| **Tidak ada integrasi LLM sama sekali** | Tidak ada SDK AI, tidak ada API key, tidak ada abstraksi provider. |
| **Baileys hanya outbound** | `services/whatsapp.ts` hanya mengirim; **belum ada handler `messages.upsert`** untuk membaca pesan masuk — prasyarat AI WA. |
| **`waMode` hanya 1 nilai per tenant** | Belum mendukung banyak nomor WA per tenant, apalagi toggle bot per nomor ("cloning"). |
| **Belum ada middleware autentikasi nyata** | Token JWT-ish dibuat saat login (`base64`) tetapi **tidak diverifikasi** di endpoint mana pun. Endpoint sensitif baru (referral, harga, AI, bot) berisiko jika pola ini diteruskan. |
| **`backend/src/index.ts` sangat besar** | Semua route menumpuk di 1 file. Modul baru sebaiknya dipecah ke `src/routes/*.ts` agar tidak makin tidak terkelola. |
| **Tidak ada `bun test`** | Belum ada test; logika trial/harga/referral butuh test karena menyangkut uang. |

### 2.3 Keputusan arsitektural yang saya ambil (dapat dikoreksi)
1. **Modularisasi wajib untuk modul baru.** Modul referral/pricing/signup/AI ditulis sebagai route Hono terpisah (`backend/src/routes/*.ts`) dan di-`app.route()` dari `index.ts`, bukan ditambahkan ke `index.ts` yang sudah ~1.500 baris.
2. **Peran marketing memakai tabel users** dengan `role = 'marketing'` (bukan tabel terpisah) agar bisa login dan memakai UI yang sama. Marketing login → hanya melihat dashboard performa kode miliknya.
3. **Free trial 7 hari dihitung dari kapan registrasi disetujui**, bukan dari kapan form dibuka.
4. **Semua nominal uang disimpan sebagai integer rupiah** (`doublePrecision` tetap dipakai agar konsisten dengan skema eksisting, tetapi nilai dibulatkan & divalidasi `>= 0`).
5. **Tidak menambah dependency AI berat**: panggilan LLM memakai `fetch` bawaan Bun ke API yang kompatibel OpenAI (OpenAI / OpenRouter / Gemini-compatible endpoint) sehingga provider bisa diganti lewat env.
6. **Integrasi `subscriptionUntil` yang sudah ada**: `trialEndsAt`/pembayaran baru **tetap menulis** ke `users.subscriptionUntil` + `tenants.subscriptionUntil` supaya semua gate login eksisting langsung ikut bekerja tanpa refactor besar.

---

## 3. Ruang Lingkup Fungsional (Functional Requirements)

### EPIC A — Kode Referral & Admin Marketing

- **FR-A1.** Superadmin dapat membuat **Admin Marketing** (nama, email, password, nomor WA, `komisi`, status aktif). Marketing dapat login dan hanya melihat data miliknya.
- **FR-A2.** Superadmin **dan** Admin Marketing dapat membuat **beberapa kode referral** (`code` unik, mis. `BUDI10`, `PROMO-RINA`).
- **FR-A3.** Setiap kode referral memiliki konfigurasi:
  - pemilik (`marketingUserId`) — mewakili 1 orang admin marketing,
  - tipe diskon: `percent` atau `fixed`,
  - nilai diskon (mis. 10% atau Rp 20.000),
  - komisi marketing (nominal/percent dari pembayaran pertama),
  - lama trial khusus kode ini (default **7 hari**),
  - kuota pemakaian (`maxUses`, `0` = tak terbatas) + penghitung `usedCount`,
  - masa berlaku (`validFrom`, `validUntil`),
  - status `active` | `inactive`.
- **FR-A4.** Kode referral **dapat diaktifkan/nonaktifkan per tenant**: admin dapat menentukan kode tertentu hanya berlaku untuk tenant tertentu (tabel aktivasi). Kode global (tanpa pembatasan tenant) tetap didukung.
- **FR-A5.** Statistik per kode: jumlah klik link, jumlah pendaftaran, jumlah yang berbayar, total pendapatan, total komisi.
- **FR-A6.** Menonaktifkan kode **tidak** membatalkan diskon tenant yang sudah terdaftar memakai kode itu (histori bersifat final).
- **FR-A7.** Superadmin dapat melihat rekap komisi marketing dan menandai komisi `pending` → `paid`.

### EPIC B — Registrasi Mandiri, Free Trial 7 Hari & Harga Bulanan

- **FR-B1.** Halaman publik `/register` (tanpa login) dengan form: nama pemilik, email, kata sandi, nomor WA, nama outlet, alamat, kota. Opsional: pilihan layanan preset.
- **FR-B2.** Link registrasi dapat dibagikan dengan parameter kode referral: `/register?ref=BUDI10`.
  - Kode **valid** → tampilkan badge "Kode Referral BUDI10 — diskon 10%", harga setelah diskon ditampilkan secara transparan.
  - Kode **tidak valid / kosong / kedaluwarsa / kuota habis** → **tetap boleh daftar** dengan **harga normal**, tanpa error yang memblokir. Beri catatan halus: "Kode referral tidak dikenali, Anda tetap mendapat trial 7 hari."
- **FR-B3.** Setiap pendaftaran **selalu** mendapat **free trial 7 hari** (baik pakai kode maupun tidak). Cara menentukan siapa yang bayar = semua orang; yang berbeda hanya harga saat perpanjangan.
- **FR-B4.** Setelah submit, sistem otomatis membuat: 1 `users` (role `tenant_owner`), 1 `tenants`, preset `services` default, dan `subscription_until = hari ini + 7 hari` serta `status = active (trial)`.
  - Keputusan: **registrasi langsung aktif (auto-provisioning)** tanpa menunggu approval, karena syarat utamanya adalah "free trial seminggu". Superadmin tetap dapat menonaktifkan dari panel.
- **FR-B5.** Halaman publik `/register/success` menampilkan kredensial login, tanggal berakhir trial, dan harga bulanan berikutnya (sudah termasuk diskon referral bila ada).
- **FR-B6.** Admin dapat mengatur **harga bulanan**: harga normal, mata uang, dan (opsional) harga khusus per durasi (3/6/12 bulan). Tersimpan di tabel `plans` dan dapat diubah tanpa deploy.
- **FR-B7.** Tenant menerima notifikasi WhatsApp otomatis: (a) saat trial dimulai, (b) H-3 sebelum trial berakhir, (c) H-1, (d) saat trial habis (akun diblokir oleh gate `subscriptionUntil` eksisting).
- **FR-B8.** Halaman **Langganan Saya** untuk tenant owner: menampilkan sisa hari trial, tanggal berakhir, harga bulanan berlaku (normal atau harga referral), dan tombol perpanjang.
- **FR-B9.** Alur pembayaran **Fase 1 (manual)**: tenant memilih paket → sistem membuat `subscription_invoices` berstatus `pending` + menampilkan instruksi transfer (memakai data rekening tenant? tidak — memakai rekening **platform**, perlu setting baru) → tenant upload bukti → superadmin verifikasi → `subscription_until` diperpanjang & invoice `paid`.
- **FR-B10.** Alur pembayaran **Fase 2 (gateway)**: integrasi payment gateway (Midtrans/Xendit) dengan webhook untuk auto-activate.
- **FR-B11.** Semua perubahan harga/diskon saat registrasi **di-snapshot** ke baris invoice/registrasi sehingga perubahan harga di kemudian hari tidak mengubah transaksi lama.
- **FR-B12.** Pencegahan abuse: 1 email = 1 akun; throttle per IP; verifikasi email (opsional, Fase 2); deteksi nomor WA duplikat (diperingatkan, tidak diblokir).
- **FR-B13.** Superadmin dapat melihat daftar pendaftar baru (asal kode referral, waktu trial berakhir, status pembayaran) dan mengubah harga maupun memperpanjang dari UI.

### EPIC C — Asisten AI (3 Kanal)

- **FR-C1.** **Provider AI terabstraksi**: 1 modul `aiProvider.ts` dengan fungsi `chatCompletion({ messages, systemPrompt, model, temperature })` memakai `fetch`; konfigurasi via env (`AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`).
- **FR-C2. AI In-Web**: menu/tab baru `ai` yang tersedia untuk semua peran yang sudah login. Berisi:
  - chat multi-turn dengan riwayat tersimpan per pengguna,
  - konteks sistem disuntik otomatis (peran user, nama outlet, data ringkas order/layanan/stok saat ini),
  - *tool/action* terkontrol: AI dapat memanggil fungsi server yang diizinkan sesuai peran (mis. marketing: "berapa pendaftaran dari kode saya minggu ini?", owner: "berapa omzet minggu ini?").
  - guardrail: AI **tidak** boleh menjalankan mutasi data (hapus order, ubah harga) kecuali lewat konfirmasi eksplisit pengguna di UI.
- **FR-C3. AI di Chat WhatsApp Admin**: pesan masuk ke nomor WA tenant diproses:
  - jika **bot OFF** → pesan hanya dicatat (mode lama).
  - jika **bot ON** → AI menyusun balasan dengan konteks tenant (jam buka, layanan & harga, status order pelanggan bila nomor dikenali, cara cek resi) lalu dikirim balik via Baileys.
  - aturan eskalasi: pesan yang mengandung kata kunci tertentu / tidak dikenali 2 kali → tandai `needs_human` dan (opsional) teruskan ke nomor admin.
  - pembatasan biaya: rate limit per nomor + batas maksimum balasan AI per jam per tenant.
  - setiap interaksi dicatat di `ai_conversations`/`ai_messages` untuk audit.
- **FR-C4. Panel Cloning WA per Nomor (Admin)**: tabel `wa_numbers` memungkinkan **lebih dari satu nomor** per tenant (mis. nomor kasir, nomor CS, nomor marketing) dengan per-nomor:
  - label, nomor telepon, sesi Baileys terisolasi (`sessionKey`),
  - `botEnabled` (nyala/mati) — inilah "cloning wa bisa diaktifkan wa bot nya atau ngga pada nomor orang",
  - `aiEnabled` + persona/system prompt AI khusus nomor itu,
  - mode per nomor: `notify_only` (hanya notifikasi order) atau `ai_bot` (notifikasi + balas AI),
  - status koneksi + tombol scan QR/disconnect + tombol kirim pesan uji,
  - log pesan masuk/keluar per nomor.
- **FR-C5.** Nomor WA utama (perilaku lama sebagai pengirim notifikasi order) tetap berjalan; `wa_numbers` dengan `isPrimary = true` mewakili nomor itu, sehingga kompatibel mundur.
- **FR-C6.** Batas kuota & biaya AI dikonfigurasi superadmin (`ai_monthly_quota_per_tenant`, peringatan saat mendekati batas).
- **FR-C7.** Kill switch global: jika `AI_ENABLED=false`, seluruh balasan AI berhenti dan hanya fitur notifikasi yang jalan.

---

## 4. Desain Basis Data (Skema Baru)

Semua tabel baru ditambahkan di `backend/src/db/schema.ts` dan DDL idempotennya di `initPostgresTables()` (`backend/src/db/index.ts`). Kolom uang memakai `doublePrecision` agar konsisten dengan skema eksisting.

### 4.1 EPIC A — Referral & Marketing

```
REAL: kolom money = doublePrecision, tanggal = text ISO
```

**`referral_codes`** — kode referral milik seorang admin marketing

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | `ref-<timestamp>` |
| `code` | text UNIQUE NOT NULL | Huruf besar, `A-Z0-9-`, 3–24 karakter, disimpan uppercase |
| `label` | text | Keterangan internal, mis. "Promo Grand Opening Bandung" |
| `marketing_user_id` | text NOT NULL → users.id | **1 kode mewakili 1 admin marketing** |
| `discount_type` | text NOT NULL default `percent` | `percent` \| `fixed` |
| `discount_value` | double NOT NULL default 0 | 10 (=10%) atau 20000 (=Rp20.000) |
| `commission_type` | text NOT NULL default `percent` | `percent` \| `fixed` |
| `commission_value` | double NOT NULL default 0 | Komisi untuk marketing |
| `trial_days` | int NOT NULL default 7 | Default 7 hari |
| `max_uses` | int NOT NULL default 0 | 0 = tidak terbatas |
| `used_count` | int NOT NULL default 0 | Ditambah saat registrasi berhasil |
| `click_count` | int NOT NULL default 0 | Ditambah saat link dibuka |
| `valid_from` | text | ISO date, null = langsung berlaku |
| `valid_until` | text | ISO date, null = tanpa batas |
| `scope` | text NOT NULL default `global` | `global` \| `tenant_specific` |
| `notes` | text | |
| `status` | text NOT NULL default `active` | `active` \| `inactive` |
| `created_by` | text → users.id | Superadmin pembuat |
| `created_at` | text NOT NULL | |

**`referral_code_tenants`** — peta aktivasi kode ke tenant tertentu (FR-A4)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `referral_code_id` | text NOT NULL → referral_codes.id | |
| `tenant_id` | text NOT NULL → tenants.id | |
| `is_active` | text NOT NULL default `true` | `true` \| `false` — toggle on/off per tenant |
| `activated_by` | text → users.id | |
| `activated_at` | text NOT NULL | |
| `deactivated_at` | text | |

*Constraint unik:* (`referral_code_id`, `tenant_id`).

**`marketing_profiles`** — data tambahan marketing (opsional, 1:1 dengan users)

| Kolom | Tipe | Catatan |
|---|---|---|
| `user_id` | text PK → users.id | |
| `phone` | text | Nomor WA marketing |
| `area` | text | Wilayah kerja |
| `bank_name`, `bank_account_number`, `bank_account_name` | text | Tujuan pencairan komisi |
| `commission_rate_default` | double default 0 | Dipakai bila kode tidak menimpa |
| `status` | text default `active` | |
| `created_at` | text | |

**`referral_events`** — log atribusi (klik, daftar, bayar)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `referral_code_id` | text NOT NULL | |
| `event_type` | text NOT NULL | `click` \| `signup` \| `payment` \| `commission_paid` |
| `tenant_id` | text | Diisi untuk `signup`/`payment` |
| `user_id` | text | Calon tenant |
| `amount` | double default 0 | Nilai pembayaran pada event `payment` |
| `commission_amount` | double default 0 | Komisi yang timbul |
| `metadata` | text | JSON: ip, userAgent, invoiceId |
| `created_at` | text NOT NULL | |

**`marketing_commissions`** — rekap komisi & status pencairan (FR-A7)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `marketing_user_id` | text NOT NULL → users.id | |
| `referral_code_id` | text NOT NULL | |
| `tenant_id` | text NOT NULL | |
| `invoice_id` | text | Invoice pemicu |
| `base_amount` | double NOT NULL | Nilai pembayaran dasar |
| `commission_amount` | double NOT NULL | |
| `status` | text NOT NULL default `pending` | `pending` \| `approved` \| `paid` \| `cancelled` |
| `paid_at` | text | |
| `notes` | text | |
| `created_at` | text NOT NULL | |

### 4.2 EPIC B — Pricing, Registrasi & Langganan

**`plans`** — harga bulanan yang diatur admin (FR-B6)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | `plan-basic` |
| `name` | text NOT NULL | "Basic", "Pro" |
| `description` | text | |
| `duration_months` | int NOT NULL default 1 | 1, 3, 6, 12 |
| `price` | double NOT NULL | Harga normal dalam rupiah |
| `currency` | text NOT NULL default `IDR` | |
| `is_default` | text NOT NULL default `false` | Plan yang dipakai saat registrasi |
| `is_public` | text NOT NULL default `true` | Tampil di halaman register |
| `max_staff` | int default 0 | 0 = tak terbatas (fitur lanjutan) |
| `max_orders_per_month` | int default 0 | 0 = tak terbatas |
| `trial_days` | int NOT NULL default 7 | **Default 7 hari** |
| `features` | text | JSON array string fitur |
| `sort_order` | int default 0 | |
| `status` | text NOT NULL default `active` | |
| `created_at`, `updated_at` | text NOT NULL | |

**`platform_settings`** — key/value konfigurasi platform (rekening penerima, kuota AI, dsb.)

| Kolom | Tipe | Catatan |
|---|---|---|
| `key` | text PK | `platform_bank_name`, `platform_bank_account`, `default_trial_days`, `ai_monthly_quota`, `wa_trial_reminder_days` |
| `value` | text | |
| `updated_by` | text | |
| `updated_at` | text NOT NULL | |

**`signup_requests`** — jejak setiap pendaftaran publik (FR-B1–B5, B11, B13)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | `signup-<timestamp>` |
| `owner_name` | text NOT NULL | |
| `email` | text NOT NULL | Disimpan lowercase |
| `phone` | text NOT NULL | |
| `outlet_name` | text NOT NULL | |
| `address`, `city` | text | |
| `password_hash` | text NOT NULL | bcrypt (Bun.password) |
| `referral_code_id` | text → referral_codes.id | NULL bila tanpa parameter |
| `referral_code_text` | text | Teks mentah dari URL (untuk audit kode invalid) |
| `referral_valid` | text NOT NULL default `false` | `true` \| `false` |
| `plan_id` | text → plans.id | Plan yang dipilih saat daftar |
| `trial_days` | int NOT NULL default 7 | |
| `trial_ends_at` | text NOT NULL | Dihitung saat registrasi |
| `status` | text NOT NULL default `active_trial` | `active_trial` \| `expired` \| `converted` \| `suspended` |
| `tenant_id` | text → tenants.id | Diisi setelah provisioning sukses |
| `user_id` | text → users.id | |
| `ip_address`, `user_agent` | text | Pencegahan abuse |
| `created_at` | text NOT NULL | |

**`subscription_invoices`** — tagihan bulanan (FR-B8, B9, B10)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | `inv-sub-<timestamp>` |
| `tenant_id` | text NOT NULL → tenants.id | |
| `user_id` | text NOT NULL → users.id | |
| `plan_id` | text → plans.id | |
| `plan_snapshot` | text | JSON: nama, durasi, harga saat transaksi (FR-B11) |
| `referral_code_id` | text → referral_codes.id | Bila transaksi memakai harga referral |
| `base_price` | double NOT NULL | Harga normal ter-snapshot |
| `discount_amount` | double NOT NULL default 0 | |
| `total_amount` | double NOT NULL | `base_price - discount_amount`, minimum 0 |
| `period_start` | text NOT NULL | |
| `period_end` | text NOT NULL | |
| `status` | text NOT NULL default `pending` | `pending` \| `awaiting_verification` \| `paid` \| `failed` \| `expired` \| `refunded` |
| `payment_method` | text | `manual_transfer` \| `qris_static` \| `gateway_midtrans` \| `gateway_xendit` |
| `proof_url` | text | Path bukti transfer (Fase 1) |
| `gateway_ref` | text | Order ID/transaction ID gateway (Fase 2) |
| `gateway_payload` | text | JSON respons webhook |
| `paid_at` | text | |
| `verified_by` | text → users.id | Superadmin pemeriksa |
| `notes` | text | |
| `created_at`, `updated_at` | text NOT NULL | |

**`subscription_events`** — audit trail siklus hidup langganan

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `tenant_id` | text NOT NULL | |
| `user_id` | text | |
| `event_type` | text NOT NULL | `trial_started` \| `trial_reminder_sent` \| `trial_expired` \| `invoice_created` \| `payment_verified` \| `subscription_extended` \| `subscription_expired` \| `suspended` \| `reactivated` |
| `invoice_id` | text | |
| `days_added` | int | |
| `new_subscription_until` | text | |
| `actor_id` | text | Pelaku (user/superadmin/system) |
| `metadata` | text | JSON |
| `created_at` | text NOT NULL | |

**Modifikasi tabel eksisting:**
- `tenants`: + `isTrial` text default `false`, + `source` text (`manual` | `self_signup`), + `referralCodeId` text, + `acquiredAt` text.
- `users`: + `isTrial`, + `signupRequestId`, + `marketingUserId` (tenant yang diajak marketing).
- Index: `tenants(subscription_until)`, `subscription_invoices(status)`, `signup_requests(created_at)`, `referral_codes(code)`.

### 4.3 EPIC C — AI & Multi-Nomor WhatsApp

**`wa_numbers`** — banyak nomor WA per tenant + toggle bot (FR-C4, C5)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | `wanum-<timestamp>` |
| `tenant_id` | text NOT NULL → tenants.id | |
| `label` | text NOT NULL | "Nomor Kasir", "CS 1" |
| `phone_number` | text | Nomor setelah tersambung (dari Baileys) |
| `session_key` | text NOT NULL UNIQUE | Kunci folder session Baileys, mis. `<tenantId>-cs1` |
| `is_primary` | text NOT NULL default `false` | Nomor pengirim notifikasi order (kompatibel mundur) |
| `bot_enabled` | text NOT NULL default `false` | **Toggle bot nyala/mati per nomor** |
| `ai_enabled` | text NOT NULL default `false` | Balas otomatis dengan AI |
| `mode` | text NOT NULL default `notify_only` | `notify_only` \| `ai_bot` |
| `ai_persona` | text | System prompt khusus nomor ini |
| `ai_greeting` | text | Pesan sambutan pertama |
| `ai_handoff_keywords` | text | JSON array, mis. `["komplain","refund","manusia"]` |
| `ai_max_replies_per_hour` | int default 60 | Rate limit |
| `notify_on_ready` | text NOT NULL default `true` | Kirim notif order siap diambil |
| `status` | text NOT NULL default `disconnected` | `connected` \| `disconnected` \| `connecting` |
| `last_connected_at`, `created_at`, `updated_at` | text | |

**`wa_messages`** — riwayat pesan masuk & keluar per nomor

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `tenant_id` | text NOT NULL | |
| `wa_number_id` | text → wa_numbers.id | |
| `direction` | text NOT NULL | `inbound` \| `outbound` |
| `remote_phone` | text NOT NULL | Nomor lawan bicara |
| `remote_name` | text | |
| `body` | text | |
| `is_ai` | text NOT NULL default `false` | Pesan ini hasil AI? |
| `handled_by` | text | `ai` \| `human` \| `system` |
| `wa_log_id` | text → wa_logs.id | Tautan bila ini notifikasi order |
| `created_at` | text NOT NULL | |

**`ai_conversations`** — sesi percakapan AI (web & WA)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `channel` | text NOT NULL | `web` \| `whatsapp` |
| `tenant_id` | text | |
| `user_id` | text | Diisi untuk channel `web` |
| `wa_number_id` | text | Diisi untuk channel `whatsapp` |
| `contact_phone` | text | Diisi untuk channel `whatsapp` |
| `title` | text | Judul otomatis dari pesan pertama |
| `context_role` | text | Role user pemilik sesi web |
| `needs_human` | text NOT NULL default `false` | Eskalasi ke manusia |
| `tokens_used` | int default 0 | Untuk monitoring biaya |
| `status` | text NOT NULL default `active` | `active` \| `archived` |
| `created_at`, `updated_at` | text NOT NULL | |

**`ai_messages`** — pesan dalam satu sesi AI

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `conversation_id` | text NOT NULL → ai_conversations.id | |
| `role` | text NOT NULL | `system` \| `user` \| `assistant` \| `tool` |
| `content` | text NOT NULL | |
| `tool_name` | text | Bila role `tool` |
| `tool_payload` | text | JSON argumen/hasil tool |
| `tokens` | int default 0 | |
| `model` | text | |
| `latency_ms` | int | |
| `created_at` | text NOT NULL | |

**`ai_usage_daily`** — agregat pemakaian untuk kuota & tagihan (FR-C6)

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `tenant_id` | text NOT NULL | |
| `usage_date` | text NOT NULL | `YYYY-MM-DD` |
| `channel` | text NOT NULL | `web` \| `whatsapp` |
| `request_count` | int default 0 | |
| `token_count` | int default 0 | |
| *unique:* (`tenant_id`, `usage_date`, `channel`) | | |

**`ai_tools`** *(opsional, bila tooling dinamis)* — daftar tool yang boleh dipanggil AI per role.

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | text PK | |
| `name` | text NOT NULL UNIQUE | `get_orders_summary` |
| `description` | text NOT NULL | Deskripsi untuk LLM |
| `allowed_roles` | text NOT NULL | JSON array role |
| `handler_key` | text NOT NULL | Nama fungsi di registry server |
| `is_mutation` | text NOT NULL default `false` | Wajib konfirmasi bila `true` |
| `status` | text NOT NULL default `active` | |

---

## 5. Kontrak REST API Baru

Semua endpoint baru memakai prefix `/api/*` dan pola respons eksisting: `{ success: boolean, message?: string, data?: T }`.

### 5.1 Referral & Marketing

| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| GET | `/api/referral-codes` | superadmin, marketing | Daftar kode (marketing hanya miliknya) + statistik agregat |
| POST | `/api/referral-codes` | superadmin, marketing | Buat kode baru (validasi unik & format) |
| GET | `/api/referral-codes/:id` | superadmin, marketing (owner) | Detail kode + daftar tenant hasil referral |
| PUT | `/api/referral-codes/:id` | superadmin, marketing (owner) | Ubah diskon, komisi, kuota, masa berlaku |
| PATCH | `/api/referral-codes/:id/status` | superadmin, marketing (owner) | Aktif / nonaktifkan kode |
| DELETE | `/api/referral-codes/:id` | superadmin | Hapus (soft-delete: set `inactive`; blokir bila sudah ada pemakaian) |
| GET | `/api/referral-codes/:id/tenants` | superadmin | Daftar tenant & status aktivasi kode ini |
| POST | `/api/referral-codes/:id/tenants` | superadmin | **Aktifkan kode untuk tenant tertentu** (FR-A4) |
| PATCH | `/api/referral-codes/:id/tenants/:tenantId` | superadmin | Toggle `is_active` per tenant |
| DELETE | `/api/referral-codes/:id/tenants/:tenantId` | superadmin | Cabut aktivasi |
| GET | `/api/marketing` | superadmin | Daftar admin marketing + performa |
| POST | `/api/marketing` | superadmin | Buat akun marketing (user `role='marketing'` + profil) |
| PUT | `/api/marketing/:userId` | superadmin | Ubah data marketing |
| DELETE | `/api/marketing/:userId` | superadmin | Nonaktifkan marketing |
| GET | `/api/marketing/:userId/performance` | superadmin, marketing | Klik, signup, konversi, pendapatan, komisi |
| GET | `/api/marketing/:userId/commissions` | superadmin, marketing | Daftar komisi |
| PATCH | `/api/commissions/:id/status` | superadmin | `pending` → `approved` → `paid` |
| POST | `/api/referral/validate` | Publik | Validasi kode untuk halaman register (tanpa efek samping) |
| POST | `/api/referral/track-click` | Publik | Catat klik link referral |

### 5.2 Registrasi, Pricing & Langganan

| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| POST | `/api/public/signup` | Publik | Registrasi mandiri; membuat user + tenant + trial 7 hari; menerima `referralCode` opsional |
| GET | `/api/public/signup-status/:signupId` | Publik | Status pendaftaran & info trial |
| GET | `/api/public/plans` | Publik | Plan publik + harga normal (untuk ditampilkan di `/register`) |
| GET | `/api/public/check-email` | Publik | Cek ketersediaan email (validasi realtime) |
| GET | `/api/plans` | superadmin | Semua plan |
| POST | `/api/plans` | superadmin | Buat plan |
| PUT | `/api/plans/:id` | superadmin | **Ubah harga bulanan** (FR-B6) |
| PATCH | `/api/plans/:id/default` | superadmin | Jadikan plan default |
| DELETE | `/api/plans/:id` | superadmin | Hapus (blokir bila sedang dipakai invoice) |
| GET | `/api/subscription/me` | tenant_owner, staff | Ringkasan langganan tenant: sisa hari, berakhir, harga berlaku, diskon |
| GET | `/api/subscription/invoices` | tenant_owner, superadmin | Daftar invoice (difilter per tenant) |
| POST | `/api/subscription/invoices` | tenant_owner | Buat invoice perpanjangan (snapshot harga + diskon referral) |
| POST | `/api/subscription/invoices/:id/proof` | tenant_owner | Upload bukti transfer (Fase 1) |
| PATCH | `/api/subscription/invoices/:id/verify` | superadmin | Verifikasi → perpanjang `subscription_until` + buat komisi marketing |
| PATCH | `/api/subscription/invoices/:id/reject` | superadmin | Tolak dengan alasan |
| POST | `/api/subscription/webhook/:provider` | Publik (signature) | Webhook payment gateway (Fase 2) |
| GET | `/api/subscription/events` | superadmin | Audit log siklus langganan |
| GET | `/api/settings/platform` | superadmin | Rekening penerima, trial default, kuota AI |
| PUT | `/api/settings/platform` | superadmin | Ubah setting platform |

### 5.3 AI & Multi-Nomor WA

| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| GET | `/api/ai/status` | Authed | Apakah AI aktif, model, sisa kuota tenant |
| GET | `/api/ai/conversations` | Authed | Daftar sesi AI milik user |
| POST | `/api/ai/conversations` | Authed | Buat sesi baru |
| GET | `/api/ai/conversations/:id/messages` | Authed (owner sesi) | Riwayat pesan |
| POST | `/api/ai/conversations/:id/messages` | Authed (owner sesi) | Kirim pesan → balasan AI (stream/sinkron) |
| DELETE | `/api/ai/conversations/:id` | Authed (owner sesi) | Arsipkan sesi |
| POST | `/api/ai/tools/:name/confirm` | Authed | Konfirmasi eksekusi tool bermutasi |
| GET | `/api/wa/numbers` | tenant_owner, superadmin | Daftar nomor WA tenant + status + toggle |
| POST | `/api/wa/numbers` | tenant_owner, superadmin | Tambah nomor (cloning) |
| PUT | `/api/wa/numbers/:id` | tenant_owner, superadmin | Ubah label, persona, limit |
| PATCH | `/api/wa/numbers/:id/bot` | tenant_owner, superadmin | **Toggle bot on/off per nomor** |
| PATCH | `/api/wa/numbers/:id/ai` | tenant_owner, superadmin | Toggle AI on/off per nomor |
| DELETE | `/api/wa/numbers/:id` | tenant_owner, superadmin | Hapus nomor + session |
| POST | `/api/wa/numbers/:id/connect` | tenant_owner, superadmin | Minta QR code untuk nomor ini |
| POST | `/api/wa/numbers/:id/disconnect` | tenant_owner, superadmin | Logout sesi nomor ini |
| GET | `/api/wa/numbers/:id/messages` | tenant_owner, superadmin | Riwayat pesan masuk/keluar nomor ini |
| POST | `/api/wa/numbers/:id/send` | tenant_owner, superadmin | Kirim pesan manual dari nomor ini |
| GET | `/api/ai/usage` | superadmin, tenant_owner | Pemakaian AI harian/bulanan |

### 5.4 Utilitas & Kompatibilitas
- `POST /api/referral/track-click` dipanggil dari `RegisterPage` saat pertama dibuka dengan `?ref=`.
- `POST /api/public/signup` **memakai ulang** `DEFAULT_PRESET_SERVICES` (dipindah ke `backend/src/constants/services.ts` agar tidak terduplikasi di `index.ts`).
- Endpoint lama tetap utuh: `POST /api/tenants` (pembuatan manual oleh superadmin) tidak diubah, hanya ditambah penulisan `source='manual'`.

---

## 6. Perubahan Frontend (Halaman, Tab & Komponen)

### 6.1 Pola Routing
Aplikasi **belum memakai react-router**; routing dilakukan manual di `App.tsx` lewat pembacaan `window.location.pathname`. Rencana:
- Tambahkan util kecil `frontend/src/utils/routeUtils.ts` berisi `getPublicRoute()` yang mengembalikan `{ name: 'app' | 'track' | 'register' | 'register-success', params }`.
- Halaman publik baru (`/register`, `/register/success`) mengikuti pola `PublicTrackingPage` yang sudah ada: dirender oleh `App.tsx` **sebelum** gate `if (!currentUser)`.
- Tab internal baru ditambahkan ke union `TabType` di `frontend/src/types/index.ts`.

### 6.2 Penambahan `TabType`
```
export type TabType =
  | ...eksisting...
  | "ai"                 // halaman asisten AI in-web
  | "subscription"       // langganan saya (tenant owner)
  | "marketing"          // kelola admin marketing (superadmin)
  | "referral"           // kelola kode referral (superadmin & marketing)
  | "plans"              // pengaturan harga bulanan (superadmin)
  | "signups"            // daftar pendaftar baru + invoice (superadmin)
  | "wa-numbers";        // cloning & toggle bot nomor WA (superadmin & tenant owner)

export type Role = "superadmin" | "tenant_owner" | "staff" | "marketing";
```

### 6.3 Matriks Akses Tab (memperbarui route-guard `App.tsx`)

| Tab | superadmin | tenant_owner | staff | marketing |
|---|---|---|---|---|
| overview, orders, customers | ya | ya | ya | tidak |
| services, cashflow, reports, settings | ya | ya | tidak | tidak |
| tenants, users, logs | ya | tidak | tidak | tidak |
| **marketing** | ya | tidak | tidak | tidak |
| **referral** | ya (semua kode) | tidak | tidak | ya (kode sendiri) |
| **plans** | ya | tidak | tidak | tidak |
| **signups** | ya | tidak | tidak | tidak |
| **ai** | ya | ya | ya | ya |
| **subscription** | monitor semua | ya (milik sendiri) | tidak | tidak |
| **wa-numbers** | ya (semua tenant) | ya (tenant sendiri) | tidak | tidak |

### 6.4 Daftar File Frontend Baru

**Halaman publik**

| File | Isi |
|---|---|
| `frontend/src/components/public/RegisterPage.tsx` | Form registrasi (7 field), state loading/error, validasi inline, panel harga dinamis |
| `frontend/src/components/public/RegisterPriceSummary.tsx` | Kartu ringkasan: harga normal, diskon referral (bila ada), trial 7 hari, total bayar setelah trial |
| `frontend/src/components/public/ReferralBadge.tsx` | Badge valid/invalid kode referral + pesan ramah |
| `frontend/src/components/public/RegisterSuccessPage.tsx` | Kredensial login, tanggal trial berakhir, CTA masuk ke aplikasi |
| `frontend/src/hooks/useRegisterForm.ts` | State form + validasi + submit ke `/api/public/signup` |
| `frontend/src/hooks/usePublicPlans.ts` | Ambil `/api/public/plans` + `/api/referral/validate` |

**Tab AI**

| File | Isi |
|---|---|
| `frontend/src/components/tabs/AiAssistantTab.tsx` | Shell halaman AI: sidebar sesi + area chat |
| `frontend/src/components/ai/AiConversationList.tsx` | Daftar sesi, tombol sesi baru, hapus/arsip |
| `frontend/src/components/ai/AiChatWindow.tsx` | Bubble pesan, streaming/loading, markdown ringan |
| `frontend/src/components/ai/AiComposer.tsx` | Textarea + kirim, disabled saat loading |
| `frontend/src/components/ai/AiToolConfirmationCard.tsx` | Kartu konfirmasi eksekusi tool bermutasi |
| `frontend/src/components/ai/AiSuggestedPrompts.tsx` | Chip prompt contoh sesuai peran |
| `frontend/src/hooks/useAiChat.ts` | Fetch sesi, kirim pesan, kelola state optimistik |

**Tab Subscription / Plans / Signups / Marketing / Referral / WA Numbers**

| File | Isi |
|---|---|
| `frontend/src/components/tabs/subscription/SubscriptionTab.tsx` | Sisa hari, tanggal berakhir, harga berlaku, tombol perpanjang |
| `frontend/src/components/tabs/subscription/RenewSubscriptionModal.tsx` | Pilih plan & durasi, tampilkan harga + diskon, buat invoice |
| `frontend/src/components/tabs/subscription/UploadPaymentProofModal.tsx` | Upload bukti transfer (Fase 1) |
| `frontend/src/components/tabs/subscription/TrialBanner.tsx` | Banner "Trial tersisa X hari" di Header |
| `frontend/src/components/tabs/admin/PlansTab.tsx` | CRUD harga bulanan (FR-B6) |
| `frontend/src/components/tabs/admin/PlanFormModal.tsx` | Form plan (nama, durasi, harga, trial days, fitur) |
| `frontend/src/components/tabs/admin/MarketingTab.tsx` | Daftar admin marketing + performa + komisi |
| `frontend/src/components/tabs/admin/MarketingFormModal.tsx` | Buat/ubah marketing |
| `frontend/src/components/tabs/admin/CommissionPayoutTable.tsx` | Tandai komisi approved/paid |
| `frontend/src/components/tabs/admin/ReferralCodesTab.tsx` | Daftar kode referral + statistik |
| `frontend/src/components/tabs/admin/ReferralCodeFormModal.tsx` | Form kode (diskon, komisi, kuota, masa berlaku) |
| `frontend/src/components/tabs/admin/ReferralCodeShareBox.tsx` | Link share + tombol salin + QR untuk link referral |
| `frontend/src/components/tabs/admin/ReferralCodeTenantActivationList.tsx` | **Toggle aktif/nonaktif kode per tenant** (FR-A4) |
| `frontend/src/components/tabs/admin/SignupsTab.tsx` | Pendaftar baru, asal kode, sisa trial, status invoice |
| `frontend/src/components/tabs/admin/SubscriptionInvoicesTab.tsx` | Verifikasi/tolak invoice masuk |
| `frontend/src/components/tabs/admin/PlatformSettingsTab.tsx` | Rekening penerima platform, trial default, kuota AI |

**Tab WA Numbers (Cloning + Toggle Bot)**

| File | Isi |
|---|---|
| `frontend/src/components/tabs/wa/WaNumbersTab.tsx` | Daftar nomor WA tenant, status koneksi, toggle bot & AI |
| `frontend/src/components/tabs/wa/WaNumberCard.tsx` | Kartu per nomor: label, nomor, badge status, switch `botEnabled` |
| `frontend/src/components/tabs/wa/AddWaNumberModal.tsx` | Tambah nomor (label + session key) |
| `frontend/src/components/tabs/wa/WaNumberQrModal.tsx` | Tampilkan QR code Baileys nomor tersebut |
| `frontend/src/components/tabs/wa/WaNumberSettingsModal.tsx` | Persona AI, greeting, handoff keyword, limit balasan/jam |
| `frontend/src/components/tabs/wa/WaMessageInbox.tsx` | Riwayat pesan masuk/keluar per nomor + filter `needs_human` |
| `frontend/src/hooks/useWaNumbers.ts` | CRUD nomor, toggle, koneksi QR |

**Sidebar & navigasi (perubahan pada file eksisting)**

| File | Perubahan |
|---|---|
| `frontend/src/components/layout/Sidebar.tsx` | Tambah menu: Asisten AI, Langganan, Marketing, Kode Referral, Harga (Plans), Pendaftar, Nomor WA - difilter per role |
| `frontend/src/components/layout/Header.tsx` | Tambah `TrialBanner` (sisa hari trial) + indikator status AI |
| `frontend/src/App.tsx` | Route publik `/register` & `/register/success`; render tab baru; route-guard marketing; pass props baru |
| `frontend/src/types/index.ts` | Tambah `TabType`, `Role`, dan interface baru (lihat 6.5) |
| `frontend/src/components/auth/LoginPage.tsx` | Tambah link "Belum punya akun? Daftar gratis 7 hari" yang mempertahankan `?ref=` bila ada |

### 6.5 Tipe TypeScript Baru (`frontend/src/types/index.ts`)
`ReferralCode`, `ReferralCodeTenantActivation`, `MarketingProfile`, `MarketingCommission`, `Plan`, `SignupRequest`, `SubscriptionInvoice`, `SubscriptionSummary`, `AiConversation`, `AiMessage`, `AiStatus`, `WaNumber`, `WaInboundMessage`.

Semua interface wajib **eksplisit** (tanpa `any`), dan setiap field tanggal memakai `string` ISO agar konsisten dengan tipe eksisting.

---

## 7. Arsitektur AI (Detail Teknis)

### 7.1 Modul Backend Baru

| File | Tanggung jawab |
|---|---|
| `backend/src/config/ai.ts` | Baca env (`AI_ENABLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_MAX_TOKENS`, `AI_TEMPERATURE`), expose getter + validasi |
| `backend/src/services/ai/provider.ts` | `chatCompletion()` memakai `fetch`; format kompatibel OpenAI; timeout + retry 1x untuk error 5xx |
| `backend/src/services/ai/promptBuilder.ts` | Menyusun system prompt per kanal & per role; menyuntik konteks ringkas (data tenant/order/statistik) |
| `backend/src/services/ai/toolRegistry.ts` | Daftar tool yang boleh dipanggil + guard `allowedRoles` + flag `isMutation` |
| `backend/src/services/ai/tools/*.ts` | Implementasi tool read-only: `getOrdersSummary`, `getServiceList`, `getTenantSubscription`, `getMarketingPerformance`, `getOrderStatusByInvoice` |
| `backend/src/services/ai/conversationService.ts` | Simpan/muat `ai_conversations` + `ai_messages`, potong riwayat (20 pesan terakhir), catat token |
| `backend/src/services/ai/usageService.ts` | Update `ai_usage_daily`, cek kuota tenant, throttle |
| `backend/src/services/ai/waBotService.ts` | Orkestrasi balasan AI untuk pesan WA masuk: cek toggle, cek kuota, panggil provider, kirim via Baileys, catat log, tandai `needs_human` |
| `backend/src/routes/ai.ts` | Endpoint AI web (`/api/ai/*`) |
| `backend/src/routes/waNumbers.ts` | Endpoint multi-nomor WA (`/api/wa/numbers/*`) |
| `backend/src/services/whatsappSessionManager.ts` | **Refactor** `services/whatsapp.ts`: sesi dikunci `sessionKey` (bukan `tenantId`) + tambah opsi `onInboundMessage` callback |

### 7.2 Perubahan `services/whatsapp.ts` (prasyarat AI WA)

Kondisi saat ini:
```
getSessionDir(tenantId)
initWhatsAppSession(tenantId, forceRefresh)
sendWhatsAppMessage(tenantId, phone, message)
```
Menjadi (kompatibel mundur - `sessionKey` default = `tenantId`):
```
getSessionDir(sessionKey: string)
initWhatsAppSession({ sessionKey, tenantId, forceRefresh, onInboundMessage })
sendWhatsAppMessage(sessionKey, phone, message)
```
Tambahan penting di dalam `initWhatsAppSession`:
1. Pasang listener `sock.ev.on("messages.upsert", handler)`.
2. Filter: abaikan `key.fromMe`, abaikan grup (`@g.us`), abaikan `status@broadcast`.
3. Ekstrak teks dari `conversation` atau `extendedTextMessage.text`.
4. Panggil `onInboundMessage({ sessionKey, from, pushName, text, timestamp })`.
5. Normalisasi nomor: buang `@s.whatsapp.net`, awalan `0` menjadi `62`.
6. `autoRestoreSavedSessions()` diubah: iterasi `wa_numbers` dengan `status='connected'` yang punya session di disk, bukan hanya daftar tenant.

### 7.3 Alur AI WhatsApp (Inbound)

```
Pesan masuk
  -> messages.upsert handler
  -> simpan wa_messages (direction=inbound)
  -> ambil wa_numbers: bot_enabled? ai_enabled? mode?
      |- bot OFF        -> selesai (hanya dicatat)
      \- bot ON
          -> cek rate limit (ai_max_replies_per_hour) & kuota harian
              |- terlampaui -> kirim fallback template, tandai needs_human
              \- lanjut
          -> deteksi handoff keyword -> tandai needs_human (tetap balas sopan)
          -> kumpulkan konteks: nama outlet, jam buka, daftar layanan+harga,
             status order terakhir bila nomor dikenali sebagai pelanggan
          -> susun prompt (persona nomor + konteks + riwayat 10 pesan terakhir)
          -> provider.chatCompletion()
          -> kirim balasan via Baileys
          -> simpan wa_messages (outbound, is_ai=true) + update ai_usage_daily
```

**Aturan penting:**
- Balasan AI tidak boleh membocorkan data tenant lain.
- AI tidak boleh mengubah status order atau membuat order. Bila pelanggan minta order, AI membalas panduan atau menandai `needs_human`.
- Bila tool `isMutation` diminta via WA: **selalu ditolak**, hanya boleh lewat web dengan konfirmasi.
- Pesan dari nomor yang sama diberi cooldown minimal 3 detik untuk mencegah loop.

### 7.4 Alur AI In-Web

```
POST /api/ai/conversations/:id/messages { content }
  -> validasi kepemilikan sesi (user_id = sesi.user_id)
  -> cek kuota tenant & AI_ENABLED
  -> simpan pesan user
  -> bangun konteks sesuai role:
      superadmin  : agregat platform (jumlah tenant, MRR, komisi, signup baru)
      marketing   : performa kode miliknya (klik, signup, konversi, komisi)
      tenant_owner: data tokonya (omzet, order aktif, SLA telat, langganan)
      staff       : order aktif, pelanggan, panduan operasional kasir
  -> kirim ke provider (dengan definisi tool bila ada)
  -> bila model meminta tool:
      read-only  -> eksekusi, hasil dikirim balik ke model, lanjut ke jawaban final
      isMutation -> JANGAN eksekusi; UI menampilkan AiToolConfirmationCard
  -> simpan jawaban assistant + token usage
  -> response { message, tokensUsed, quotaRemaining }
```

### 7.5 Guardrail & Keamanan AI
1. **Data terisolasi**: konteks hanya dari `tenantId` milik sesi; tanpa query lintas tenant kecuali role `superadmin`.
2. **Tanpa mutasi dari chat**: tool mutasi (buat order, ubah harga, hapus) hanya dieksekusi setelah `POST /api/ai/tools/:name/confirm` dengan argumen yang dilihat & disetujui pengguna.
3. **Batas panjang & biaya**: `max_tokens` per balasan, potong riwayat, `ai_monthly_quota` per tenant.
4. **Anti prompt-injection**: teks pesan pelanggan WA dibungkus penanda `<pesan_pelanggan>...</pesan_pelanggan>` dan system prompt menyatakan isi itu **data**, bukan instruksi.
5. **Audit**: semua interaksi tersimpan di `ai_messages` + agregat di `ai_usage_daily`.
6. **Kill switch**: `AI_ENABLED=false` membuat endpoint AI mengembalikan `503 { success:false, message:"Fitur AI sedang dinonaktifkan" }` dan `waBotService` langsung keluar.

### 7.6 Variabel Environment Baru
Ditambahkan ke `backend/.env.example`:
```
AI_ENABLED=true
AI_PROVIDER=openai-compatible
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=800
AI_TEMPERATURE=0.4
AI_MONTHLY_QUOTA_DEFAULT=100000
PLATFORM_BANK_NAME=
PLATFORM_BANK_ACCOUNT_NUMBER=
PLATFORM_BANK_ACCOUNT_NAME=
DEFAULT_TRIAL_DAYS=7
```

---

## 8. Roadmap Bertahap (Fase 0 - Fase 7)

Setiap fase menghasilkan sistem yang **masih berjalan** (tidak ada fase yang meninggalkan aplikasi setengah jadi). Estimasi hari adalah perkiraan kerja 1 developer.

---

### FASE 0 — Fondasi & Keamanan (Prasyarat semua fase) · ±3 hari

Alasan: modul baru menyentuh uang dan data lintas tenant. Menambah kemampuan di atas autentikasi palsu berisiko besar.

- [ ] Buat `backend/src/middleware/auth.ts`: verifikasi token (perbaiki generasi token agar HMAC-signed, bukan base64 mentah) → set `c.set("user", { userId, role, tenantId })`
- [ ] Buat `backend/src/middleware/rbac.ts`: helper `requireRole([...])` dan `requireTenantAccess(tenantId)` yang membandingkan dengan `tenantId` di token
- [ ] Terapkan middleware ke endpoint sensitif eksisting (tenants, users, extend, orders delete) — **tanpa mengubah bentuk respons** agar frontend lama tetap jalan
- [ ] Buat `backend/src/middleware/rateLimit.ts` (in-memory, per IP + per route) untuk endpoint publik (`/api/public/*`, `/api/referral/validate`)
- [ ] Pindahkan `DEFAULT_PRESET_SERVICES` dari `index.ts` ke `backend/src/constants/services.ts`
- [ ] Buat `backend/src/utils/id.ts` (`newId(prefix)`) dan `backend/src/utils/date.ts` (`addDays`, `toDateOnly`, `daysBetween`) — dipakai bersama oleh signup, trial, invoice
- [ ] Buat `backend/src/utils/money.ts`: `roundRupiah`, `applyDiscount(base, type, value)`, `calculateCommission(base, type, value)` — **wajib unit-tested**
- [ ] Siapkan `bun test` (`backend/package.json` script `test`) + file test pertama `backend/src/utils/money.test.ts`
- [ ] Verifikasi: `bunx tsc --noEmit` di backend & frontend hijau; `bun test` hijau

**Definition of Done Fase 0:** semua endpoint lama masih berfungsi (uji manual login, list order, buat order, ubah status, cetak struk), util uang punya test.

---

### FASE 1 — Skema Database & Seed (Prasyarat Fase 2-6) · ±2 hari

- [ ] Tambah semua tabel baru ke `backend/src/db/schema.ts` (Bagian 4.1, 4.2, 4.3)
- [ ] Tambah kolom baru ke `tenants` (`isTrial`, `source`, `referralCodeId`, `acquiredAt`) dan `users` (`isTrial`, `signupRequestId`, `marketingUserId`)
- [ ] Tambah DDL idempoten di `initPostgresTables()` (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
- [ ] Tambah pembuatan index (Bagian 4.2 akhir)
- [ ] Perluas `backend/src/db/seed.ts`:
  - [ ] 1 plan default (`Basic`, 1 bulan, harga dari `DEFAULT_MONTHLY_PRICE`), `is_default = true`
  - [ ] `platform_settings` default (rekening kosong, `default_trial_days = 7`)
  - [ ] 1 user superadmin tetap seperti sekarang
  - [ ] 1 contoh user marketing + 2 kode referral contoh (untuk demo & test manual)
  - [ ] Migrasi data lama: untuk setiap tenant eksisting, buat baris `wa_numbers` `is_primary = true` dengan `session_key = tenant.id` dan `bot_enabled = false` (mempertahankan perilaku lama)
- [ ] Verifikasi: jalankan backend, pastikan tabel baru terbentuk & data lama tidak rusak; login lama tetap berhasil

**Definition of Done Fase 1:** `bun run dev` backend sukses tanpa error; `tenant-01` lama masih bisa login & order; tabel baru terisi seed.

---

### FASE 2 — Referral & Marketing (EPIC A) · ±5 hari

**Backend**
- [ ] `backend/src/routes/referralCodes.ts` — CRUD kode + endpoint statistik (Bagian 5.1)
- [ ] `backend/src/routes/marketing.ts` — CRUD admin marketing + performa + komisi
- [ ] `backend/src/services/referralService.ts`:
  - [ ] `generateCode(label)` — buat kode unik & mudah dibaca
  - [ ] `validateCode(code, { tenantId? })` → `{ valid, reason, code }` (cek status, masa berlaku, kuota, aktivasi tenant)
  - [ ] `recordClick(codeId, metadata)`
  - [ ] `recordSignup(codeId, signupRequestId, tenantId)` → tambah `used_count`
  - [ ] `computeDiscount(basePrice, code)` → pakai `utils/money.ts`
  - [ ] `recordCommission(tenantId, invoice, code)` → baris `marketing_commissions` + `referral_events`
- [ ] Perbarui `POST /api/auth/login` untuk mendukung `role = 'marketing'` (marketing tidak wajib punya tenant)
- [ ] Perbarui `GET /api/users` & `POST /api/users` agar bisa menampilkan/membuat role marketing

**Frontend**
- [ ] `frontend/src/components/tabs/admin/MarketingTab.tsx` + `MarketingFormModal.tsx` + `CommissionPayoutTable.tsx`
- [ ] `frontend/src/components/tabs/admin/ReferralCodesTab.tsx` + `ReferralCodeFormModal.tsx`
- [ ] `frontend/src/components/tabs/admin/ReferralCodeShareBox.tsx` (link `/{origin}/register?ref=KODE` + tombol salin + QR memakai `qrcode` yang sudah terpasang)
- [ ] `frontend/src/components/tabs/admin/ReferralCodeTenantActivationList.tsx` (toggle per tenant)
- [ ] `frontend/src/hooks/useReferralCodes.ts`, `frontend/src/hooks/useMarketing.ts`
- [ ] Tambah tab `marketing` & `referral` ke `TabType`, `Sidebar`, dan route-guard `App.tsx` (marketing hanya boleh `overview` ringkas + `referral` + `ai`)

**Verifikasi**
- [ ] Uji: buat marketing → buat 3 kode → aktifkan 1 kode hanya untuk `tenant-01` → `POST /api/referral/validate` mengembalikan valid hanya saat `tenantId=tenant-01`
- [ ] Uji: kode kedaluwarsa & kode kuota habis mengembalikan `valid: false` dengan alasan spesifik
- [ ] Uji: login sebagai marketing hanya melihat kode miliknya (verifikasi di API, bukan hanya UI)

**Definition of Done Fase 2:** superadmin dapat mengelola marketing, kode referral, aktivasi per tenant, dan melihat statistik; marketing dapat login dan melihat data miliknya saja.

---

### FASE 3 — Registrasi Mandiri, Trial 7 Hari & Harga Bulanan (EPIC B) · ±7 hari

**Backend**
- [ ] `backend/src/routes/plans.ts` — CRUD plan + set default + endpoint publik `/api/public/plans`
- [ ] `backend/src/routes/platformSettings.ts` — GET/PUT setting platform
- [ ] `backend/src/routes/signup.ts` — `POST /api/public/signup`, `GET /api/public/signup-status/:id`, `GET /api/public/check-email`
- [ ] `backend/src/services/signupService.ts` — orkestrasi provisioning:
  - [ ] Validasi input (email unik, email format, password minimal 6 karakter, nomor WA format Indonesia)
  - [ ] Validasi kode referral (opsional, **tidak memblokir** bila invalid — isi `referral_code_text` + `referral_valid=false`)
  - [ ] Tentukan `trialDays` = plan.trial_days (default 7) atau code.trial_days bila kode valid & lebih spesifik
  - [ ] Buat `users` (role `tenant_owner`, `isTrial=true`, `subscriptionUntil = today + trialDays`, `status='active'`)
  - [ ] Buat `tenants` (`source='self_signup'`, `isTrial=true`, `subscriptionUntil` sama, `referralCodeId` bila ada)
  - [ ] Seed preset layanan tenant baru (pakai `constants/services.ts`)
  - [ ] Buat baris `signup_requests` (termasuk IP & user agent)
  - [ ] Buat baris `subscription_events` (`trial_started`)
  - [ ] Bila kode valid: `recordSignup` + `referral_events`
  - [ ] Kirim WA sambutan via nomor primer tenant (best-effort, jangan gagalkan registrasi bila WA error)
- [ ] `backend/src/services/subscriptionService.ts`:
  - [ ] `getSubscriptionSummary(tenantId)` — sisa hari, status trial, harga berlaku, diskon
  - [ ] `createInvoice(tenantId, planId)` — snapshot harga + diskon, hitung `total_amount`
  - [ ] `verifyInvoice(invoiceId, verifierId)` — set `paid`, perpanjang `users.subscriptionUntil` + `tenants.subscriptionUntil`, tulis `subscription_events`, buat komisi marketing
  - [ ] `rejectInvoice(invoiceId, reason)`
  - [ ] `getApplicablePrice(tenantId)` — harga referral dari `tenants.referralCodeId` bila ada, jika tidak harga normal plan default
- [ ] `backend/src/routes/subscription.ts` — endpoint Bagian 5.2
- [ ] `backend/src/jobs/trialReminder.ts` — pengecekan terjadwal (interval 1 jam) untuk H-3, H-1, dan hari-H trial habis; catat di `subscription_events` agar tidak terkirim dua kali
- [ ] Registrasi job ini di `backend/src/index.ts` setelah `initPostgresTables()`

**Frontend**
- [ ] `frontend/src/components/public/RegisterPage.tsx` (+ `RegisterPriceSummary`, `ReferralBadge`)
- [ ] `frontend/src/components/public/RegisterSuccessPage.tsx`
- [ ] `frontend/src/hooks/useRegisterForm.ts`, `usePublicPlans.ts`
- [ ] `frontend/src/utils/routeUtils.ts` + integrasi route `/register` & `/register/success` di `App.tsx`
- [ ] Link "Daftar gratis 7 hari" di `LoginPage.tsx` (pertahankan `?ref=`)
- [ ] `frontend/src/components/tabs/subscription/SubscriptionTab.tsx` + `RenewSubscriptionModal.tsx` + `UploadPaymentProofModal.tsx` + `TrialBanner.tsx`
- [ ] `frontend/src/components/tabs/admin/PlansTab.tsx` + `PlanFormModal.tsx`
- [ ] `frontend/src/components/tabs/admin/SignupsTab.tsx` + `SubscriptionInvoicesTab.tsx` + `PlatformSettingsTab.tsx`
- [ ] Tambah tab `subscription`, `plans`, `signups` ke `TabType`, `Sidebar`, route-guard

**Verifikasi**
- [ ] Uji daftar **tanpa** `?ref` → tenant dibuat, `subscription_until = hari ini + 7 hari`, `referral_code_id = null`
- [ ] Uji daftar **dengan** `?ref=KODEVALID` → tampil diskon, `referral_code_id` terisi, `used_count` bertambah 1
- [ ] Uji daftar dengan `?ref=KODEPALSU` → **berhasil daftar**, `referral_valid=false`, harga normal, tanpa error
- [ ] Uji daftar dengan email yang sudah ada → 400 dengan pesan jelas
- [ ] Uji login tenant baru → berhasil, banner trial menampilkan 7 hari
- [ ] Uji ubah harga plan di admin → harga di `/register` langsung berubah (tanpa deploy)
- [ ] Uji H-3/H-1 reminder (simulasi tanggal) → `wa_logs` mencatat, tidak terkirim ganda
- [ ] Uji invoice manual: buat → upload bukti → verifikasi superadmin → `subscription_until` bertambah sesuai durasi plan
- [ ] Uji tenant dengan `subscription_until` kemarin → login ditolak dengan `SUBSCRIPTION_EXPIRED` (regresi gate lama tetap jalan)

**Definition of Done Fase 3:** orang luar dapat mendaftar sendiri, mendapat 7 hari akses, dan perpanjangan berbayar dapat diverifikasi admin tanpa menyentuh database manual.

---

### FASE 4 — Multi-Nomor WhatsApp & Toggle Bot (EPIC C, Bagian 1 dari 2) · ±5 hari

Fase ini **tidak memakai AI dulu** — tujuannya memastikan cloning nomor + toggle bot bekerja, agar Fase 5 (AI) tinggal menempel.

**Backend**
- [ ] Refactor `backend/src/services/whatsapp.ts` sesuai Bagian 7.2:
  - [ ] `getSessionDir(sessionKey)` + map session key → tenant
  - [ ] `initWhatsAppSession({ sessionKey, tenantId, forceRefresh, onInboundMessage })` dengan kompatibilitas mundur (bila argumen string, anggap `sessionKey === tenantId`)
  - [ ] Pasang listener `messages.upsert` + filter (`fromMe`, grup, broadcast)
  - [ ] Simpan `wa_messages` (inbound + outbound) — untuk semua nomor, terlepas bot on/off
  - [ ] `autoRestoreSavedSessions()` membaca `wa_numbers` (bukan hanya `tenants`)
  - [ ] Saat koneksi berhasil: update `wa_numbers.status='connected'`, `phone_number` dari `sock.user.id`, `last_connected_at`
  - [ ] Saat `connection.update` → `close`: set `status='disconnected'`
- [ ] `backend/src/services/waNumberService.ts`: CRUD nomor, generate `session_key` unik, hapus session dari disk saat nomor dihapus
- [ ] `backend/src/routes/waNumbers.ts` — semua endpoint Bagian 5.3
- [ ] `backend/src/services/orderNotifyService.ts`: pindahkan logika "kirim WA saat status `ready`" dari `index.ts` ke service, dan ubah agar memilih nomor dengan `notify_on_ready = true` + `is_primary` (fallback `tenant.waMode` lama bila tenant belum punya baris `wa_numbers`)
- [ ] Update `POST /api/orders` & `PATCH /api/orders/:id/status` agar memakai `orderNotifyService` (jangan hapus respons `waData` agar UI lama tetap jalan)
- [ ] Perbarui `GET /api/whatsapp/status` & `/connect` & `/disconnect` agar menerima `waNumberId` opsional (bila kosong → nomor primer)

**Frontend**
- [ ] `frontend/src/components/tabs/wa/WaNumbersTab.tsx` + semua komponen pendukung (Bagian 6.4)
- [ ] `frontend/src/hooks/useWaNumbers.ts`
- [ ] Tombol global "Cloning Nomor Baru" di tab ini
- [ ] Switch `botEnabled` per nomor → optimistik UI + rollback bila API gagal
- [ ] Tambah tab `wa-numbers` ke `TabType`, `Sidebar`, route-guard
- [ ] Pertahankan `WhatsAppSettingsModal.tsx` lama agar tetap dapat dipakai untuk nomor primer (kompatibilitas)

**Verifikasi**
- [ ] Sambungkan nomor primer tenant → verifikasi baris `wa_numbers` primer ter-update (status connected + nomor terisi)
- [ ] Tambah nomor kedua → scan QR → kedua sesi hidup bersamaan tanpa saling menimpa (cek folder session berbeda di disk)
- [ ] Matikan `botEnabled` pada nomor kedua → kirim pesan masuk → **tidak** ada balasan, tetapi pesan tercatat di `wa_messages`
- [ ] Nyalakan `botEnabled` → kirim pesan masuk → tercatat, `needs_human` tetap `false` (belum ada AI di fase ini), tanpa balasan otomatis
- [ ] Ubah status order ke `ready` → notifikasi tetap terkirim hanya dari nomor `notify_on_ready = true`
- [ ] Restart backend → semua sesi `connected` dipulihkan otomatis

**Definition of Done Fase 4:** satu tenant bisa punya >1 nomor WA dengan sesi terisolasi, tiap nomor punya toggle bot on/off, dan seluruh pesan masuk/keluar tercatat.

---

### FASE 5 — Asisten AI: Web + WhatsApp (EPIC C, Bagian 2 dari 2) · ±7 hari

**Backend — fondasi AI**
- [ ] `backend/src/config/ai.ts` + tambahkan env ke `backend/.env.example` (Bagian 7.6)
- [ ] `backend/src/services/ai/provider.ts` — `chatCompletion()` memakai `fetch`, timeout 30s, retry 1x untuk 5xx/429, parsing `choices[0].message`
- [ ] `backend/src/services/ai/promptBuilder.ts` — system prompt per role & per kanal + penyuntik konteks
- [ ] `backend/src/services/ai/contextService.ts` — kumpulkan konteks:
  - [ ] `buildSuperadminContext()` — jumlah tenant aktif, tenant akan expired, total komisi pending, signup 7 hari terakhir
  - [ ] `buildMarketingContext(userId)` — kode miliknya + klik/signup/konversi/komisi
  - [ ] `buildTenantOwnerContext(tenantId)` — nama outlet, jam buka, omzet bulan ini, order aktif, order telat SLA, sisa langganan, daftar layanan
  - [ ] `buildStaffContext(tenantId)` — order aktif, order siap diambil, pelanggan baru hari ini
  - [ ] `buildCustomerContext(tenantId, phone)` — status order terakhir pelanggan (untuk AI WA)
- [ ] `backend/src/services/ai/toolRegistry.ts` + `tools/` (read-only dulu, sesuai Bagian 7.1)
- [ ] `backend/src/services/ai/conversationService.ts` — CRUD sesi & pesan, pemotongan riwayat, hitung token
- [ ] `backend/src/services/ai/usageService.ts` — `ai_usage_daily` + cek kuota + throttle per menit
- [ ] `backend/src/routes/ai.ts` — semua endpoint Bagian 5.3 bagian AI

**Backend — AI WhatsApp**
- [ ] `backend/src/services/ai/waBotService.ts` — alur Bagian 7.3 lengkap:
  - [ ] Cek `bot_enabled`, `ai_enabled`, `AI_ENABLED`
  - [ ] Rate limit per nomor + kuota tenant
  - [ ] Deteksi `ai_handoff_keywords` → `needs_human = true`
  - [ ] Bangun konteks pelanggan (jika nomor dikenal) + persona nomor
  - [ ] Panggil provider → kirim balasan via Baileys → simpan `wa_messages` + `ai_messages`
  - [ ] Fallback template bila provider error (jangan biarkan pelanggan tanpa balasan)
  - [ ] Bungkus teks pelanggan dengan `<pesan_pelanggan>` (anti prompt injection)
  - [ ] Tulis juga baris `wa_logs` (status `sent`/`failed`) agar muncul di modal log WA yang sudah ada
- [ ] Hubungkan `waBotService` ke `onInboundMessage` dari Fase 4
- [ ] Guard: AI WA **tidak** boleh memanggil tool `isMutation` (tolak + catat)

**Frontend**
- [ ] `frontend/src/components/tabs/AiAssistantTab.tsx` + folder `components/ai/*` (Bagian 6.4)
- [ ] `frontend/src/hooks/useAiChat.ts` + `frontend/src/hooks/useAiStatus.ts`
- [ ] `frontend/src/components/tabs/wa/WaNumberSettingsModal.tsx` — persona AI, greeting, handoff keyword, limit
- [ ] `frontend/src/components/tabs/wa/WaMessageInbox.tsx` — daftar pesan + badge `needs_human`
- [ ] `frontend/src/components/tabs/admin/PlatformSettingsTab.tsx` — kuota AI
- [ ] Tambah tab `ai` ke `TabType`, `Sidebar` (semua role), route-guard
- [ ] Indikator "AI Aktif / Nonaktif" di `Header.tsx`

**Verifikasi**
- [ ] AI web: login sebagai tenant_owner → tanya "berapa omzet saya bulan ini?" → angka **cocok** dengan tab Arus Kas
- [ ] AI web: login sebagai superadmin → tanya "tenant mana yang akan expired minggu ini?" → data cocok dengan tab Tenants
- [ ] AI web: login sebagai staff → tanya "ada order telat SLA?" → data cocok dengan tab Kasir
- [ ] AI web: user A tidak bisa membaca sesi user B (`GET /api/ai/conversations/:id/messages` mengembalikan 403)
- [ ] AI web: tanya "hapus order INV-..." → UI menampilkan kartu konfirmasi, **tidak** ada data terhapus sebelum dikonfirmasi
- [ ] AI WA: bot ON + AI ON → kirim "berapa harga cuci bedcover?" dari nomor lain → balasan memuat harga dari master layanan tenant tersebut
- [ ] AI WA: kirim "saya mau komplain" → `needs_human = true`, muncul di inbox
- [ ] AI WA: bot OFF → tidak ada balasan, pesan tetap tercatat
- [ ] Kuota: set kuota sangat kecil → permintaan setelahnya mengembalikan pesan kuota habis (bukan 500)
- [ ] `AI_ENABLED=false` → semua endpoint AI 503, `waBotService` tidak membalas, fitur notifikasi order tetap jalan

**Definition of Done Fase 5:** asisten AI web berfungsi untuk 4 role dengan data nyata & guardrail mutasi; AI WA membalas otomatis pada nomor yang bot-nya dinyalakan, dengan pencatatan lengkap.

---

### FASE 6 — Pengerasan, Kuota, Notifikasi Trial & Kerapian Administrasi · ±4 hari

- [ ] Notifikasi WA trial (H-3, H-1, habis) — pastikan tidak terkirim ganda (`subscription_events`)
- [ ] Panel superadmin: indikator tenant trial vs berbayar, filter "trial berakhir <= 3 hari"
- [ ] Kuota AI: peringatan di UI saat pemakaian > 80% kuota bulanan
- [ ] Ekspor CSV: daftar tenant, daftar pendaftar, performa marketing, komisi, invoice langganan (pakai pola ekspor CSV eksisting)
- [ ] Batas jumlah nomor WA per tenant berdasarkan plan (`max_wa_numbers` — tambah kolom ke `plans`)
- [ ] Batas jumlah staff per tenant (`max_staff`) — sudah ada kolomnya, tinggal ditegakkan
- [ ] Audit log admin: siapa mengubah harga, siapa memverifikasi invoice (tulis ke `subscription_events` + tabel log umum)
- [ ] Halaman publik `/pricing` (daftar plan publik + CTA daftar) untuk mendukung link marketing
- [ ] Optimasi query: agregat statistik referral & komisi jangan `select *` seluruh tabel
- [ ] Uji beban ringan: 50 pesan WA masuk berturut-turut tidak memblokir event loop (pakai antrean sederhana per nomor)

---

### FASE 7 — Payment Gateway (Opsional / Lanjutan) · ±5 hari

Dikerjakan hanya bila klien sudah punya akun gateway. Tanpa fase ini, alur manual Fase 3 sudah lengkap dan dapat dipakai.

- [ ] Pilih provider (Midtrans Snap atau Xendit Invoice) & simpan kredensial di env
- [ ] `backend/src/services/paymentGateway.ts` — buat transaksi + verifikasi signature webhook
- [ ] `POST /api/subscription/webhook/:provider` — verifikasi signature → `verifyInvoice` otomatis
- [ ] `POST /api/subscription/invoices` — bila `payment_method` gateway, kembalikan `paymentUrl`
- [ ] Frontend: `RenewSubscriptionModal` menampilkan tombol "Bayar Sekarang" yang membuka `paymentUrl`
- [ ] Uji dengan sandbox: bayar → webhook → `subscription_until` bertambah tanpa intervensi admin

---

## 9. Urutan Migrasi & Ketergantungan

```
FASE 0 (fondasi & util)
   └─> FASE 1 (skema & seed)  <-- wajib sebelum semua fase berikut
         ├─> FASE 2 (referral & marketing)
         │      └─> FASE 3 (signup & pricing)  <-- butuh validateCode dari Fase 2
         │             └─> FASE 6 (pengerasan)
         │             └─> FASE 7 (gateway, opsional)
         └─> FASE 4 (multi-nomor WA & toggle bot)
                └─> FASE 5 (AI web & AI WA)
                       └─> FASE 6 (pengerasan)
```

**Aturan migrasi data lama (wajib, agar tidak ada tenant yang rusak):**
1. Semua tenant eksisting mendapat `isTrial = 'false'`, `source = 'manual'`, `subscriptionUntil` **tidak diubah**.
2. Semua tenant eksisting mendapat 1 baris `wa_numbers` dengan `session_key = tenants.id`, `is_primary = 'true'`, `bot_enabled = 'false'`. Sesi Baileys di disk yang sudah ada langsung terbaca oleh kode baru karena `session_key` sama dengan `tenantId` lama.
3. `tenants.waMode` tetap dipertahankan sebagai fallback bila baris `wa_numbers` primer tidak ditemukan (jaring pengaman).
4. Tidak ada kolom lama yang dihapus atau di-rename.
5. Semua DDL baru memakai `IF NOT EXISTS` sehingga aman dijalankan berulang.

---

## 10. Kriteria Penerimaan (Definition of Done Keseluruhan)

Sistem dianggap **selesai** bila seluruh poin berikut terbukti dengan pengujian nyata (bukan asumsi):

### 10.1 Referral & Marketing
1. Superadmin dapat membuat minimal 3 admin marketing, masing-masing dapat login.
2. Satu marketing dapat memiliki banyak kode referral; setiap kode dapat memiliki diskon & komisi berbeda.
3. Satu kode referral dapat diaktifkan untuk tenant A dan dinonaktifkan untuk tenant B secara bersamaan; validasi kode menghormati status tersebut.
4. Statistik per kode menampilkan angka yang **dapat direkonsiliasi manual** dari tabel `referral_events` (klik, signup, pembayaran).
5. Marketing hanya dapat membaca data miliknya; API menolak (403) permintaan data marketing lain meskipun ID ditebak.

### 10.2 Registrasi & Trial
6. `/register` dapat dibuka **tanpa sesi login**.
7. Registrasi **tanpa** `?ref` berhasil dan menghasilkan `subscription_until = hari registrasi + 7 hari`.
8. Registrasi **dengan** `?ref` valid berhasil, atribusi kode tercatat, `used_count` bertambah tepat 1.
9. Registrasi **dengan** `?ref` tidak valid **tetap berhasil** tanpa halaman error, memakai harga normal, dan nilai mentah kode tetap tersimpan untuk audit.
10. Tenant baru dapat login dan langsung memakai POS, layanan, kasir, dan cetak struk.
11. Setelah 7 hari (disimulasikan), login ditolak dengan `SUBSCRIPTION_EXPIRED` dan muncul modal nonaktif yang sudah ada.
12. Harga bulanan dapat diubah admin, dan perubahan itu terlihat di halaman register **tanpa** deploy ulang.
13. Invoice lama menyimpan snapshot harga sehingga tidak berubah meskipun harga plan diubah kemudian.

### 10.3 WhatsApp Multi-Nomor & Bot Toggle
14. Satu tenant dapat menghubungkan minimal 2 nomor WA dengan sesi terisolasi (masing-masing punya folder session sendiri).
15. Toggle bot per nomor bekerja: nomor dengan bot OFF tidak membalas, nomor dengan bot ON membalas (di Fase 5).
16. Semua pesan masuk & keluar tercatat di `wa_messages` dengan `wa_number_id` yang benar.
17. Notifikasi order "siap diambil" tetap terkirim ke pelanggan hanya dari nomor yang `notify_on_ready = true`.
18. Setelah restart backend, semua sesi yang berstatus `connected` pulih otomatis.

### 10.4 AI
19. Tab Asisten AI tersedia untuk superadmin, tenant_owner, staff, dan marketing setelah login.
20. Jawaban AI berbasis **data nyata** (angka cocok dengan halaman terkait), bukan data karangan.
21. Riwayat percakapan tersimpan dan dapat dilanjutkan setelah refresh/reload.
22. Percakapan antar pengguna terisolasi; pengguna lain tidak dapat membaca sesi orang lain.
23. Operasi bermutasi **tidak** dijalankan tanpa konfirmasi eksplisit di UI.
24. AI WhatsApp membalas hanya pada nomor yang `bot_enabled = true` **dan** `ai_enabled = true`.
25. Kata kunci handoff menandai percakapan `needs_human` dan tampil di inbox.
26. `AI_ENABLED=false` menghentikan semua fungsi AI tanpa mengganggu notifikasi order, POS, kasir, dan laporan.
27. Kuota AI yang habis menghasilkan pesan yang jelas, bukan error 500, dan tidak menghabiskan biaya lebih lanjut.

### 10.5 Kualitas Teknis
28. `bunx tsc --noEmit` bersih di backend **dan** frontend (tanpa `any` baru).
29. `bun test` hijau, dengan test wajib untuk: `applyDiscount`, `calculateCommission`, perhitungan periode trial, dan validasi kode referral.
30. `bun run build` frontend sukses.
31. Tidak ada endpoint baru yang sensitif tanpa pemeriksaan role.
32. `README.md` & `.env.example` diperbarui; `TODO.md` diberi bagian baru yang merujuk dokumen ini.

---

## 11. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | **Penyalahgunaan free trial berulang** (bikin akun baru tiap 7 hari) | Kehilangan pendapatan | Batasi 1 email = 1 akun; throttle IP; deteksi nomor WA duplikat; verifikasi email di Fase 6; catat `ip_address` di `signup_requests` untuk analisis |
| R2 | **Kuota/token AI tidak terkendali** | Biaya API melonjak | Kuota bulanan per tenant, rate limit per nomor & per jam, `max_tokens`, kill switch global |
| R3 | **Nomor WA diblokir WhatsApp** karena balasan AI terlalu agresif | Layanan notifikasi ikut mati | Delay acak antar balasan, batas balasan/jam, tidak membalas pesan duplikat, hindari kirim massal, pisahkan sesi notifikasi (nomor primer) dari sesi bot |
| R4 | **AI membocorkan data antar tenant** | Pelanggaran privasi serius | Konteks dibangun per `tenantId`; tool divalidasi role; test isolasi wajib |
| R5 | **Prompt injection dari pelanggan WA** | AI melakukan hal di luar kewenangan | Bungkus pesan pelanggan sebagai data, larang tool mutasi via WA, tidak pernah mengeksekusi perintah dari teks pelanggan |
| R6 | **Refactor `services/whatsapp.ts` merusak notifikasi order yang sudah jalan** | Notifikasi pelanggan berhenti | Pertahankan `sessionKey = tenantId` untuk nomor primer; jaga respons `waData`; uji regresi notifikasi `ready` di setiap fase |
| R7 | **Migrasi skema merusak data produksi** | Kehilangan data tenant | DDL `IF NOT EXISTS`; tidak menghapus kolom; backup PostgreSQL sebelum menjalankan Fase 1 di produksi |
| R8 | **`backend/src/index.ts` makin tidak terkelola** | Sulit dipelihara | Semua modul baru di `routes/` terpisah; jangan menambah route baru ke `index.ts` |
| R9 | **Belum ada gateway pembayaran** | Konversi lambat karena verifikasi manual | Fase 3 manual sudah cukup untuk rilis; Fase 7 gateway; tampilkan instruksi transfer & konfirmasi yang jelas |
| R10 | **Token auth palsu dipakai untuk endpoint keuangan baru** | Akses tidak sah | Fase 0 wajib selesai sebelum Fase 2-5; token ditandatangani HMAC + middleware verifikasi |
| R11 | **Registrasi otomatis dipakai untuk spam tenant** | Database kotor | Rate limit per IP, validasi email, superadmin tetap dapat menonaktifkan, filter daftar pendaftar mencurigakan |
| R12 | **Waktu kirim AI lebih lambat dari pesan berikutnya** (pelanggan kirim 3 pesan cepat) | Balasan ganda/kacau | Antrean per nomor (`ai_max_replies_per_hour`) + cooldown 3 detik + gabungkan pesan dalam jendela 5 detik |

---

## 12. Keputusan yang Perlu Dikonfirmasi Sebelum Implementasi

Dokumen ini sudah dibuat dengan asumsi yang masuk akal, tetapi 6 hal berikut **secara material mengubah implementasi**. Konfirmasi diperlukan agar tidak salah arah:

| # | Pertanyaan | Asumsi yang saya pakai sekarang | Alternatif |
|---|---|---|---|
| Q1 | **Arti "kode referral diaktifkan ke masing-masing tenant"** | Kode dibuat global lalu admin memilih tenant mana yang boleh memakainya (`referral_code_tenants`). Kode baru tidak otomatis berlaku untuk tenant lama. | (a) Kode otomatis berlaku untuk semua tenant, aktivasi hanya untuk pengecualian; (b) kode hanya untuk tenant tertentu sejak dibuat |
| Q2 | **Apakah discount referral memengaruhi harga trial?** | Tidak. Trial selalu gratis 7 hari; diskon hanya berlaku pada pembayaran bulanan pertama (dan boleh diteruskan ke perpanjangan — perlu diputuskan). | Tetapkan diskon hanya untuk 1 pembayaran pertama, atau teruskan selama 3 bulan |
| Q3 | **Apakah registrasi langsung aktif atau perlu approval superadmin?** | Langsung aktif (auto-provisioning) karena ada trial 7 hari yang jadi nilai jualnya. | Perlu approval email/verifikasi nomor terlebih dahulu |
| Q4 | **Pembayaran manual atau gateway sejak awal?** | Manual dulu (transfer + upload bukti + verifikasi superadmin) di Fase 3, gateway jadi Fase 7 opsional. | Gateway sejak Fase 3 (butuh akun Midtrans/Xendit sejak awal) |
| Q5 | **Peran marketing: pengguna terpisah yang bisa login, atau hanya data atribusi?** | Bisa login (role `marketing`) dan melihat dashboard performa kodenya sendiri. | Hanya data internal superadmin; marketing tidak punya akun |
| Q6 | **"AI dari chat WA admin" — AI membalas pelanggan, admin, atau keduanya?** | AI membalas **pesan masuk dari pelanggan** pada nomor tenant yang bot-nya menyala; admin tetap bisa mengambil alih kapan pun (`needs_human`). | AI hanya merangkum & menyarankan balasan, pengiriman tetap manual oleh admin |
| Q7 | **Provider AI mana yang dipakai?** | API kompatibel OpenAI, dikonfigurasi lewat env, default model hemat biaya. | OpenAI resmi / Gemini / model lokal (Ollama) — tinggal ganti `AI_BASE_URL` & `AI_MODEL` |
| Q8 | **Batas jumlah nomor WA per tenant?** | Dibatasi per plan, default 1 nomor di plan termurah. | Tanpa batas |

**Default sementara yang saya sarankan untuk mulai bekerja:** Q1-(a asumsi sekarang), Q2-tidak, Q3-langsung aktif, Q4-manual dulu, Q5-bisa login, Q6-bot membalas pelanggan, Q7-OpenAI-compatible, Q8-dibatasi per plan.

---

## 13. Ringkasan Checklist Master

Salinan ringkas seluruh TODO agar mudah dipantau (detailnya ada di Bagian 8).

### FASE 0 — Fondasi & Keamanan
- [ ] Middleware auth (token HMAC) + RBAC + terapkan ke endpoint sensitif lama
- [ ] Rate limit endpoint publik
- [ ] `constants/services.ts`, `utils/id.ts`, `utils/date.ts`, `utils/money.ts`
- [ ] Setup `bun test` + test util uang
- [ ] `tsc --noEmit` backend & frontend bersih

### FASE 1 — Skema & Seed
- [ ] 12 tabel baru di `schema.ts` + DDL idempoten + index
- [ ] Kolom baru `tenants` & `users`
- [ ] Seed: plan default, platform settings, marketing contoh, 2 kode referral contoh
- [ ] Migrasi: 1 baris `wa_numbers` primer per tenant lama
- [ ] Backend jalan & data lama utuh

### FASE 2 — Referral & Marketing
- [ ] `routes/referralCodes.ts`, `routes/marketing.ts`
- [ ] `services/referralService.ts` (generate, validate, click, signup, discount, commission)
- [ ] Login & user management mendukung role `marketing`
- [ ] Tab Marketing + Kode Referral + Share Box + Aktivasi per Tenant
- [ ] Uji: marketing terisolasi, validasi kode sesuai status & tenant

### FASE 3 — Registrasi, Trial & Harga
- [ ] `routes/plans.ts`, `routes/platformSettings.ts`, `routes/signup.ts`, `routes/subscription.ts`
- [ ] `services/signupService.ts` (provisioning lengkap)
- [ ] `services/subscriptionService.ts` (summary, invoice, verify, reject, harga berlaku)
- [ ] Job pengingat trial H-3 / H-1 / habis
- [ ] Halaman publik `/register` + `/register/success`
- [ ] Tab Langganan, Harga (Plans), Pendaftar, Invoice
- [ ] Uji: tanpa ref, ref valid, ref invalid, email duplikat, expiry gate, ubah harga, verifikasi invoice

### FASE 4 — Multi-Nomor WA & Toggle Bot
- [ ] Refactor `whatsapp.ts` → `sessionKey` + `messages.upsert` + `wa_messages`
- [ ] `services/waNumberService.ts`, `routes/waNumbers.ts`
- [ ] `services/orderNotifyService.ts` (notifikasi `ready` pindah dari `index.ts`)
- [ ] Tab Nomor WA (daftar, tambah, QR, toggle bot, inbox)
- [ ] Uji: 2 nomor bersamaan, bot off/on, restore setelah restart

### FASE 5 — Asisten AI (Web + WA)
- [ ] `config/ai.ts`, `services/ai/provider.ts`, `promptBuilder.ts`, `contextService.ts`
- [ ] `toolRegistry.ts` + tools read-only
- [ ] `conversationService.ts`, `usageService.ts`, `routes/ai.ts`
- [ ] `waBotService.ts` + koneksi ke `onInboundMessage`
- [ ] Tab Asisten AI + antarmuka komponen AI
- [ ] Setelan AI & inbox per nomor WA, kuota AI di platform settings
- [ ] Uji: data akurat per role, isolasi sesi, tanpa mutasi tanpa konfirmasi, AI WA membalas/handoff, kill switch

### FASE 6 — Pengerasan
- [ ] Pengingat trial anti-ganda, filter "trial berakhir <= 3 hari"
- [ ] Peringatan kuota AI, batas nomor WA & staff sesuai plan
- [ ] Audit log perubahan harga & verifikasi invoice
- [ ] Ekspor CSV (tenant, pendaftar, performa marketing, komisi, invoice)
- [ ] Halaman publik `/pricing`
- [ ] Optimasi query statistik & antrean pesan WA masuk

### FASE 7 — Payment Gateway (Opsional)
- [ ] `services/paymentGateway.ts` + webhook + `paymentUrl` di invoice
- [ ] Tombol "Bayar Sekarang" di modal perpanjangan
- [ ] Uji sandbox end-to-end

### Dokumen & Konfigurasi
- [ ] Perbarui `README.md` (cara menjalankan, env baru, alur registrasi & langganan)
- [ ] Perbarui `backend/.env.example` & `frontend/.env.example`
- [ ] Perbarui `TODO.md` dengan bagian modul baru yang merujuk `PLAN_REFERRAL_AI.md`

---

## 14. Estimasi Total

| Fase | Cakupan | Estimasi |
|---|---|---|
| Fase 0 | Fondasi & Keamanan | ±3 hari |
| Fase 1 | Skema & Seed | ±2 hari |
| Fase 2 | Referral & Marketing | ±5 hari |
| Fase 3 | Registrasi, Trial & Harga | ±7 hari |
| Fase 4 | Multi-Nomor WA & Toggle Bot | ±5 hari |
| Fase 5 | Asisten AI (Web + WA) | ±7 hari |
| Fase 6 | Pengerasan | ±4 hari |
| Fase 7 | Payment Gateway (opsional) | ±5 hari |
| **Total wajib (Fase 0-6)** | | **±33 hari kerja** |
| **Total dengan gateway** | | **±38 hari kerja** |

Urutan pengerjaan yang disarankan bila ingin cepat terlihat hasilnya: **Fase 0 → 1 → 3 (registrasi & trial lebih dulu, karena ini yang menghasilkan uang) → 2 (referral) → 4 → 5 (AI) → 6**. Fase 2 dan 3 dapat ditukar karena keduanya hanya bergantung pada Fase 1.

---

## 15. Catatan Penutup

1. Dokumen ini **tidak mengubah satu baris kode pun** — isinya rencana kerja yang siap dieksekusi fase per fase.
2. Semua nama tabel dan endpoint dirancang mengikuti konvensi yang sudah ada di repo (prefix `tenantId`, respons `{ success, message, data }`, warna string untuk status).
3. Prinsip utamanya: **jangan merusak fitur yang sudah jalan**. Setiap fase diverifikasi dengan pengujian regresi pada POS, notifikasi WA, shift kasir, laporan, dan tracking publik.
4. Tiga hal yang paling berisiko dan wajib dikerjakan dengan hati-hati: refactor `services/whatsapp.ts` (R6), migrasi skema (R7), dan autentikasi (R10).
5. Setelah Bagian 12 dikonfirmasi, Fase 0 dapat langsung dimulai.
