import { OperationalContext } from "./types";
import { checkRoleAccessViolation } from "./rbacGuard";

/**
 * Fallback cerdas jika API Cloud AI sedang sibuk atau offline
 * Menguasai 100% informasi Menu, Settings, Alur Kasir, Shift, dan Operasional Laundry.
 * DILENGKAPI DENGAN ROLE-BASED ACCESS CONTROL (RBAC) YANG KETAT:
 * - Kasir (staff) TIDAK BOLEH mengakses panduan Setting, Tambah Kasir, Rekening/QRIS,
 *   Buku Kas, Laporan Finansial, WhatsApp Gateway, Langganan, atau Menu Admin Pusat.
 */
export function generateLocalFallbackReply(
  message: string,
  context: OperationalContext,
  role: string
): string {
  const lower = message.toLowerCase();
  const isStaff = role === "staff" || role === "kasir";
  const isOwner = role === "tenant_owner" || role === "owner";
  const isMarketing = role === "marketing";

  // =========================================================================
  // 0. GUARD PERAN (RBAC) - TOLAK JIKA BUKAN DI RANAH ROLE PENGGUNA
  // =========================================================================
  const rbacViolation = checkRoleAccessViolation(message, role, context);
  if (rbacViolation) {
    return rbacViolation.reply;
  }

  // =========================================================================
  // 1. PANDUAN PENGATURAN & SETTINGS (Owner & Superadmin only)
  // =========================================================================
  if (
    lower.includes("setting") ||
    lower.includes("pengaturan") ||
    lower.includes("jam buka") ||
    lower.includes("jam operasional") ||
    lower.includes("jam kerja") ||
    lower.includes("rekening") ||
    lower.includes("qris") ||
    lower.includes("printer") ||
    lower.includes("struk") ||
    lower.includes("tambah kasir") ||
    lower.includes("tambah staf") ||
    lower.includes("ganti password")
  ) {
    if (lower.includes("jam buka") || lower.includes("jam operasional") || lower.includes("jam kerja")) {
      return (
        `⏰ **Panduan Mengatur Jam Buka Outlet:**\n\n` +
        `1. Masuk ke menu **Pengaturan** di bilah navigasi kiri.\n` +
        `2. Cari bagian **Informasi Jam Operasional Outlet**.\n` +
        `3. Atur jadwal buka untuk:\n` +
        `   • Senin - Jumat (contoh: *08:00 - 17:00*)\n` +
        `   • Sabtu (contoh: *08:00 - 14:00*)\n` +
        `   • Minggu (contoh: *Tutup* atau *09:00 - 12:00*)\n` +
        `4. Klik tombol **Simpan Pengaturan** di bawah.\n\n` +
        `ℹ️ *Manfaat:* Jam operasional ini otomatis dicantumkan di struk thermal dan pesan WhatsApp yang dikirimkan ke pelanggan saat cucian siap diambil!\n\n` +
        `[ACTION:NAVIGATE:settings]`
      );
    }

    if (lower.includes("rekening") || lower.includes("qris") || lower.includes("bank")) {
      return (
        `💳 **Panduan Mengatur Rekening Bank & QRIS Outlet:**\n\n` +
        `1. Buka menu **Pengaturan**.\n` +
        `2. Di bagian **Informasi Rekening Bank & Pembayaran**, isi data:\n` +
        `   • **Nama Bank**: (BCA, Mandiri, BRI, BNI, BSI, dll.)\n` +
        `   • **Nomor Rekening**: nomor rekening toko\n` +
        `   • **Atas Nama**: nama pemilik rekening\n` +
        `   • **Info / Tautan QRIS**: teks petunjuk atau link QRIS\n` +
        `3. Klik **Simpan Pengaturan**.\n\n` +
        `ℹ️ *Manfaat:* Data rekening ini otomatis tercantum di struk cetak dan notifikasi WhatsApp jika pelanggan memilih metode bayar Transfer/QRIS.\n\n` +
        `[ACTION:NAVIGATE:settings]`
      );
    }

    if (lower.includes("tambah kasir") || lower.includes("tambah staf") || lower.includes("staf") || lower.includes("staff")) {
      return (
        `👥 **Panduan Manajemen Akun Kasir / Staf Outlet:**\n\n` +
        `1. Buka menu **Pengaturan** (hanya bisa diakses oleh Pemilik Outlet/Super Admin).\n` +
        `2. Scroll ke bagian **Manajemen Staf Kasir**.\n` +
        `3. Masukkan data kasir baru:\n` +
        `   • **Nama Staf** (contoh: *Siti Kasir Pagi*)\n` +
        `   • **Email Login** (contoh: *siti@laundry.com*)\n` +
        `   • **Kata Sandi Awal** (minimal 6 karakter)\n` +
        `4. Klik tombol **Tambah Staf**.\n\n` +
        `🔒 *Keamanan:* Akun staf otomatis terisolasi hanya bisa membuka meja kasir dan pelanggan, serta dibatasi dari laporan laba bersih dan penghapusan pesanan.\n\n` +
        `[ACTION:NAVIGATE:settings]`
      );
    }

    if (lower.includes("printer") || lower.includes("struk") || lower.includes("thermal")) {
      return (
        `🖨️ **Panduan Format Struk Kasir & Printer Thermal:**\n\n` +
        `Sistem Laundry Cleanique mendukung 2 ukuran printer thermal standar:\n` +
        `1. **Kertas 58mm (Printer Saku / Bluetooth Portable):**\n` +
        `   • Ideal untuk meja kasir minimalis atau cetak langsung dari smartphone/tablet.\n` +
        `2. **Kertas 80mm (Desktop POS Thermal):**\n` +
        `   • Tampilan lebih lega dengan rincian item cucian yang lebih lebar.\n\n` +
        `📄 **Cara Cetak Struk:**\n` +
        `1. Di menu Kasir, klik tombol **Cetak Struk** pada pesanan.\n` +
        `2. Di jendela pratinjau nota, pilih tombol ukuran **58mm** atau **80mm**.\n` +
        `3. Klik **Cetak Struk Fisik** (Ctrl+P) untuk mengirim langsung ke printer thermal.\n\n` +
        `[ACTION:NAVIGATE:orders]`
      );
    }

    // Panduan setting umum
    return (
      `⚙️ **Pusat Pengaturan Outlet (Settings Guide):**\n\n` +
      `Di menu **Pengaturan**, Pemilik Outlet dapat mengonfigurasi:\n` +
      `1. **Profil Outlet:** Nama cabang, no. WhatsApp, alamat lengkap, dan kota.\n` +
      `2. **Jam Operasional:** Jadwal hari kerja & weekend yang tercantum di nota.\n` +
      `3. **Rekening & QRIS:** Info pembayaran non-tunai untuk struk dan WA.\n` +
      `4. **Gateway WhatsApp:** Pilihan mode Baileys (scan QR) atau mode manual.\n` +
      `5. **Manajemen Staf:** Tambah akun kasir baru dan kontrol password staf.\n` +
      `6. **Fitur Shift Kasir:** Sakelar aktifkan/nonaktifkan shift kasir.\n\n` +
      `[ACTION:NAVIGATE:settings]`
    );
  }

  // =========================================================================
  // 2. PANDUAN WHATSAPP GATEWAY & SCAN QR (Owner & Superadmin only)
  // =========================================================================
  if (lower.includes("whatsapp") || lower.includes("wa") || lower.includes("baileys") || lower.includes("scan qr")) {
    return (
      `📲 **Panduan Menghubungkan WhatsApp Outlet (Baileys Gateway):**\n\n` +
      `Laundry Cleanique menyediakan gateway WhatsApp otomatis via Baileys multi-session:\n\n` +
      `1. Klik tombol **Hubungkan WhatsApp** di bawah atau klik ikon WhatsApp di pojok kanan atas dashboard.\n` +
      `2. Pilih mode **Otomatis (Baileys)**.\n` +
      `3. Klik tombol **Scan QR Baru**.\n` +
      `4. Buka aplikasi WhatsApp di HP outlet Anda ➔ Buka **Perangkat Tertaut (Linked Devices)** ➔ **Tautkan Perangkat**.\n` +
      `5. Pindai QR Code yang tampil di layar komputer.\n` +
      `6. Setelah status berubah hijau **"Terhubung"**, outlet Anda otomatis dapat mengirim struk digital dan notifikasi cucian siap diambil!\n\n` +
      `💡 *Mode Cadangan:* Jika tidak ingin scan QR, Anda bisa memilih mode **Manual (wa.me)** untuk mengirim chat via WhatsApp Web.\n\n` +
      `[ACTION:OPEN_MODAL:whatsapp]`
    );
  }

  // =========================================================================
  // 3. PANDUAN SHIFT KASIR & UANG LACI (Staff & Owner)
  // =========================================================================
  if (lower.includes("shift") || lower.includes("buka shift") || lower.includes("tutup shift") || lower.includes("selisih kas")) {
    return (
      `💵 **Panduan Manajemen Shift Kasir & Rekonsiliasi Kas Laci:**\n\n` +
      `Fitur shift kasir mencegah terjadinya selisih uang fisik kasir:\n\n` +
      `1. **Buka Shift (Awal Giliran Kerja):**\n` +
      `   • Klik menu Buka Shift Kasir.\n` +
      `   • Masukkan nominal **Uang Modal Awal Kasir** (kembalian di laci kasir).\n` +
      `   • Klik **Buka Shift Sekarang**.\n\n` +
      `2. **Selama Shift Berjalan:**\n` +
      `   • Setiap transaksi yang dibayar tunai (Cash) otomatis dicatat ke ID shift aktif kasir yang melayani.\n\n` +
      `3. **Tutup Shift (Akhir Giliran Kerja):**\n` +
      `   • Klik **Tutup Shift Kasir**.\n` +
      `   • Hitung seluruh uang tunai fisik yang ada di laci kasir.\n` +
      `   • Masukkan angka riil fisik ke kolom **Total Uang Fisik**.\n` +
      `   • Sistem otomatis menghitung: Modal Awal + Uang Masuk Tunai vs Uang Fisik.\n` +
      `   • Jika pas, selisih = Rp 0 (Seimbang) ✅.\n\n` +
      `[ACTION:OPEN_MODAL:open_shift]`
    );
  }

  // =========================================================================
  // 4. PANDUAN ALUR KASIR POS & STATUS ORDER (Staff & Owner)
  // =========================================================================
  if (
    lower.includes("kasir") ||
    lower.includes("order") ||
    lower.includes("pesanan") ||
    lower.includes("buat nota") ||
    lower.includes("status") ||
    lower.includes("ready") ||
    lower.includes("sla")
  ) {
    return (
      `🛒 **Panduan Meja Kasir POS & Siklus Cucian:**\n\n` +
      `**A. Membuat Pesanan Baru:**\n` +
      `1. Buka menu **Kasir** di navigasi kiri.\n` +
      `2. Klik tombol **+ Order Baru**.\n` +
      `3. Pilih pelanggan atau ketik nama & nomor WhatsApp pelanggan baru langsung di form.\n` +
      `4. Pilih paket layanan (Kiloan, Satuan, Express, dll.) dan masukkan berat/qty.\n` +
      `5. Pilih status bayar: **Lunas** (Tunai/QRIS/Transfer) atau **Belum Lunas**.\n` +
      `6. Simpan ➔ Struk digital langsung terkirim via WhatsApp pelanggan!\n\n` +
      `**B. 6 Tahap Status Cucian:**\n` +
      `• 🟡 **Antrian (process)**: Cucian baru masuk & menunggu antrian mesin.\n` +
      `• 🔵 **Sedang Dicuci (washing)**: Di dalam mesin cuci.\n` +
      `• 🟣 **Kering & Setrika (drying_ironing)**: Pengeringan dan setrika uap.\n` +
      `• 🟢 **Siap Diambil (ready)**: Pakaian bersih & rapi siap diambil. *(WhatsApp otomatis terkirim ke pelanggan)*.\n` +
      `• ⚪ **Selesai Diambil (completed)**: Pakaian telah diserahkan dan lunas.\n` +
      `• 🔴 **Dibatalkan (cancelled)**: Dibatalkan jika ada kendala.\n\n` +
      `[ACTION:NAVIGATE:orders]`
    );
  }

  // =========================================================================
  // 5. PANDUAN BUKU KAS, LAPORAN & KEUANGAN (Owner & Superadmin)
  // =========================================================================
  if (
    lower.includes("buku kas") ||
    lower.includes("arus kas") ||
    lower.includes("pengeluaran") ||
    lower.includes("laba") ||
    lower.includes("laporan") ||
    lower.includes("excel") ||
    lower.includes("pdf")
  ) {
    if (lower.includes("laporan") || lower.includes("excel") || lower.includes("pdf")) {
      return (
        `📈 **Panduan Cetak Laporan Keuangan (PDF & Excel):**\n\n` +
        `1. Masuk ke menu **Laporan** di navigasi kiri.\n` +
        `2. Atur rentang tanggal laporan (Hari Ini, 7 Hari Terakhir, Bulan Ini, atau Kustom).\n` +
        `3. Pantau ringkasan omset kotor, pengeluaran toko, dan laba bersih.\n` +
        `4. Klik tombol **Ekspor CSV (Excel)** untuk mengolah data di spreadsheet.\n` +
        `5. Klik tombol **Cetak PDF Resmi** untuk mencetak dokumen ber-kop surat outlet dengan format rapi dan tanda tangan verifikasi.\n\n` +
        `[ACTION:NAVIGATE:reports]`
      );
    }
    return (
      `💰 **Panduan Buku Kas & Arus Kas Toko:**\n\n` +
      `Menu **Buku Kas** mencatat pergerakan uang toko secara otomatis:\n` +
      `1. **Uang Masuk (Income):** Dihitung otomatis dari setiap cucian yang lunas.\n` +
      `2. **Pengeluaran Toko (Expense):**\n` +
      `   • Klik tombol **+ Catat Pengeluaran**.\n` +
      `   • Masukkan kategori: Beli Deterjen, Pewangi, Plastik, Listrik/Air, Gaji Karyawan, dll.\n` +
      `   • Masukkan nominal uang yang keluar.\n` +
      `3. **Laba Bersih:** Sistem otomatis mengurangi (Uang Masuk - Pengeluaran Toko).\n\n` +
      `[ACTION:NAVIGATE:cashflow]`
    );
  }

  // =========================================================================
  // 6. PANDUAN MASTER LAYANAN (Owner & Superadmin)
  // =========================================================================
  if (lower.includes("layanan") || lower.includes("tarif") || lower.includes("harga") || lower.includes("kiloan")) {
    return (
      `🏷️ **Panduan Master Tarif & Layanan Laundry:**\n\n` +
      `1. Masuk ke menu **Layanan**.\n` +
      `2. Anda dapat melihat daftar tarif aktif per Kg, Pcs, Meter (Karpet), atau Pasang (Sepatu).\n` +
      `3. Untuk menambah layanan baru: klik **+ Tambah Layanan** ➔ isi nama, harga per unit, minimal order, dan durasi SLA jam (contoh: Express 6 jam, Reguler 48 jam).\n` +
      `4. Anda juga bisa mengedit tarif lama atau menonaktifkan layanan sementara.\n\n` +
      `[ACTION:NAVIGATE:services]`
    );
  }

  // =========================================================================
  // 7. PANDUAN PELANGGAN & CEK RESI (Semua Role)
  // =========================================================================
  if (lower.includes("pelanggan") || lower.includes("customer") || lower.includes("resi") || lower.includes("tracking")) {
    return (
      `👥 **Panduan Data Pelanggan & Cek Resi Mandiri:**\n\n` +
      `1. **Menu Pelanggan:**\n` +
      `   • Menyimpan nomor WhatsApp, alamat, dan total riwayat transaksi setiap pelanggan.\n` +
      `   • Terdapat tombol chat WhatsApp 1-klik ke nomor pelanggan.\n` +
      `2. **Portal Cek Resi Mandiri:**\n` +
      `   • Setiap struk kasir memiliki QR Code unik.\n` +
      `   • Pelanggan cukup scan QR Code di HP untuk melihat status cucian secara live tanpa perlu login di alamat: \`/track/[nomor-nota]\`.\n\n` +
      `[ACTION:NAVIGATE:customers]`
    );
  }

  // =========================================================================
  // 8. PANDUAN LANGGANAN & INVOICE OUTLET (Owner)
  // =========================================================================
  if (lower.includes("langganan") || lower.includes("paket") || lower.includes("perpanjang") || lower.includes("invoice")) {
    return (
      `⏰ **Panduan Langganan Aplikasi & Perpanjangan Outlet:**\n\n` +
      `1. Masuk ke menu **Langganan** di navigasi samping.\n` +
      `2. Anda dapat melihat sisa hari masa aktif outlet Anda.\n` +
      `3. Untuk memperpanjang: klik **Perpanjang Langganan**, masukkan kode promo referral diskon jika ada, lalu transfer ke rekening pusat.\n` +
      `4. Unggah foto bukti transfer ➔ Super Admin akan memverifikasi dan masa aktif otomatis bertambah.\n\n` +
      `[ACTION:NAVIGATE:subscription]`
    );
  }

  // =========================================================================
  // 9. KATALOG SELURUH MENU (Role-Aware Overview)
  // =========================================================================
  if (
    lower.includes("menu apa saja") ||
    lower.includes("daftar menu") ||
    lower.includes("panduan menu") ||
    lower.includes("semua menu") ||
    lower.includes("fitur")
  ) {
    if (role === "staff") {
      return (
        `📋 **Peta Menu Meja Kerja Kasir (Role: Kasir Staff):**\n\n` +
        `Sebagai kasir, Anda memiliki akses fokus pada operasional harian:\n` +
        `1. 📊 **Dashboard:** Meja kerja kasir, antrian cucian siap diambil, dan status shift.\n` +
        `2. 🛒 **Kasir (Orders):** Input pesanan baru kiloan/satuan, ubah status cucian, cetak struk thermal, dan pelunasan kasir.\n` +
        `3. 👥 **Pelanggan:** Data kontak nomor WhatsApp pelanggan untuk follow up.\n` +
        `4. 💵 **Shift Kasir:** Buka shift modal awal dan rekonsiliasi kas laci saat tutup shift.\n\n` +
        `[ACTION:NAVIGATE:orders]`
      );
    }

    if (role === "superadmin") {
      return (
        `👑 **Peta Menu Pusat (Role: Super Admin HQ):**\n\n` +
        `1. 📊 **Dashboard:** Konsolidasi omset seluruh cabang & grafik pertumbuhan.\n` +
        `2. 🏪 **Cabang (Tenants):** Kelola seluruh outlet franchise & aktivasi cabang.\n` +
        `3. 🛡️ **Pengguna:** Kelola akun Super Admin, Owner, Staf, & perpanjang lisensi.\n` +
        `4. 📝 **Pendaftar Mandiri:** Verifikasi pendaftar baru dari website publik.\n` +
        `5. 💳 **Verifikasi Tagihan:** Konfirmasi bukti bayar langganan cabang.\n` +
        `6. 📦 **Paket & Harga:** Konfigurasi skema paket langganan SaaS.\n` +
        `7. 🏷️ **Kode Referral & Mitra Marketing:** Manajemen affiliate dan komisi promosi.\n` +
        `8. ⚙️ **Setting Platform:** Konfigurasi rekening bank pusat & gateway WA HQ.\n` +
        `9. 📜 **Data Log:** Audit trail aktivitas sistem dan pengiriman pesan.\n\n` +
        `[ACTION:NAVIGATE:tenants]`
      );
    }

    if (role === "marketing") {
      return (
        `💼 **Peta Menu Mitra Marketing (Role: Affiliate Marketing):**\n\n` +
        `1. 🏷️ **Mitra Marketing:** Pantau kode referral unik Anda, statistik klik, dan jumlah tenant yang mendaftar.\n` +
        `2. 💰 **Riwayat Komisi:** Cek akumulasi komisi dari setiap outlet langganan yang menggunakan kode Anda.`
      );
    }

    // Role Tenant Owner
    return (
      `🏪 **Peta Menu Lengkap Dashboard Outlet (Role: Pemilik Outlet):**\n\n` +
      `1. 📊 **Dashboard**: Ringkasan performa hari ini, omset, cucian aktif & siap diambil.\n` +
      `2. 🛒 **Kasir (POS)**: Input order kiloan/satuan, ubah status, quick pay, dan cetak struk thermal.\n` +
      `3. 🏷️ **Layanan**: Master tarif jasa cuci, satuan, dan durasi SLA pengerjaan.\n` +
      `4. 💰 **Buku Kas**: Catat pengeluaran operasional toko dan pantau laba bersih.\n` +
      `5. 👥 **Pelanggan**: Database kontak pelanggan & riwayat cucian.\n` +
      `6. ⏰ **Langganan**: Pantau sisa masa aktif outlet & perpanjangan paket.\n` +
      `7. 📈 **Laporan**: Rekap omset, ekspor CSV Excel, dan cetak PDF resmi.\n` +
      `8. ⚙️ **Pengaturan**: Konfigurasi jam buka, rekening bank/QRIS, WA Baileys, akun staf kasir.\n\n` +
      `[ACTION:NAVIGATE:overview]`
    );
  }

  // =========================================================================
  // 10. RINGKASAN OMSET & OPERASIONAL TOKO HARI INI
  // =========================================================================
  if (
    lower.includes("ringkasan") ||
    lower.includes("omset") ||
    lower.includes("performa") ||
    lower.includes("hari ini")
  ) {
    if (isStaff) {
      return (
        `📊 **Ringkasan Operasional Hari Ini (${context.todayStr})**\n\n` +
        `🏪 **Outlet:** ${context.outletName}\n` +
        `🧺 **Antrian Cucian:**\n` +
        `• Sedang Diproses: **${context.processCount}** nota\n` +
        `• Siap Diambil: **${context.readyCount}** nota\n` +
        `• Selesai Hari Ini: **${context.completedCount}** nota\n\n` +
        `💡 *Tips Kasir:* Segera hubungi pelanggan yang cuciannya siap diambil via WhatsApp agar tidak menumpuk di rak!\n\n` +
        `[ACTION:NAVIGATE:orders]`
      );
    }

    return (
      `📊 **Ringkasan Operasional Hari Ini (${context.todayStr})**\n\n` +
      `🏪 **Outlet:** ${context.outletName}\n` +
      `📦 **Pesanan Masuk Hari Ini:** ${context.ordersTodayCount} pesanan\n` +
      `💰 **Omset Tunai / Lunas Hari Ini:** Rp ${context.revenueToday.toLocaleString("id-ID")}\n\n` +
      `🧺 **Status Antrian Cucian:**\n` +
      `• Sedang Diproses (Cuci/Setrika): **${context.processCount}** nota\n` +
      `• Siap Diambil Pelanggan: **${context.readyCount}** nota\n` +
      `• Selesai Hari Ini: **${context.completedCount}** nota\n` +
      `• Tagihan Belum Lunas: **${context.unpaidCount}** nota\n\n` +
      `💡 *Tips:* Hubungi pelanggan cucian siap diambil via WhatsApp agar pakaian tidak menumpuk di outlet!\n\n` +
      `[ACTION:NAVIGATE:orders]`
    );
  }

  // =========================================================================
  // 11. PANDUAN NODA CUCIAN (Semua Role)
  // =========================================================================
  if (
    lower.includes("tinta") ||
    lower.includes("minyak") ||
    lower.includes("darah") ||
    lower.includes("luntur") ||
    lower.includes("noda") ||
    lower.includes("karat")
  ) {
    if (lower.includes("tinta")) {
      return (
        `🧼 **Panduan Penanganan Noda Tinta Pulpen:**\n\n` +
        `1. **Jangan Langsung Kucek / Cuci Air Panas**, karena akan mengunci pigmen tinta ke serat kain.\n` +
        `2. Berikan tetesan alkohol 70% atau cairan hand sanitizer langsung ke bagian noda.\n` +
        `3. Tepuk-tepuk perlahan menggunakan kain mikrofiber bersih dari belakang kain agar tinta terserap keluar.\n` +
        `4. Setelah noda memudar, oleskan sedikit deterjen cair konsentrat, diamkan 10 menit.\n` +
        `5. Cuci di mesin cuci seperti biasa dengan air bersuhu normal.`
      );
    }
    if (lower.includes("darah")) {
      return (
        `🩸 **Panduan Penanganan Noda Darah:**\n\n` +
        `1. **Wajib Air Dingin:** Jangan pernah memakai air hangat/panas karena darah mengandung protein yang akan menggumpal dan melekat permanen pada suhu tinggi.\n` +
        `2. Rendam pakaian dalam larutan air dingin + 1 sendok makan garam dapur selama 15-20 menit.\n` +
        `3. Jika noda membandel, teteskan sedikit hidrogen peroksida 3% (untuk pakaian putih/warna tahan luntur).\n` +
        `4. Kucek lembut hingga pudar, lalu cuci biasa.`
      );
    }
    if (lower.includes("minyak") || lower.includes("lemak")) {
      return (
        `🍳 **Panduan Penanganan Noda Minyak & Makanan:**\n\n` +
        `1. Taburkan bedak tabur atau tepung maizena pada noda untuk menyerap kelebihan minyak selama 15 menit, lalu kibaskan.\n` +
        `2. Teteskan sabun cuci piring cair (misal Sunlight/Mama Lemon) langsung ke bekas minyak karena formula ampuh memecah ikatan lemak.\n` +
        `3. Gosok lembut dengan sikat gigi berbulu halus dari arah luar ke dalam.\n` +
        `4. Cuci dengan air hangat suam kuku.`
      );
    }
    return (
      `🧼 **Aturan Emas Treatment Noda Laundry:**\n\n` +
      `1. Kenali jenis kain (katun, sifon, wol, sintetis).\n` +
      `2. Tes cairan pembersih di bagian tersembunyi (lipatan dalam baju).\n` +
      `3. Selalu tepuk (blotting) dari sisi luar noda ke tengah agar noda tidak melebar.\n` +
      `4. Bersihkan noda sebelum pakaian masuk proses setrika/panas.`
    );
  }

  // =========================================================================
  // 12. DRAF PROMO WHATSAPP (Owner & Superadmin)
  // =========================================================================
  if (lower.includes("promo") || lower.includes("diskon") || lower.includes("broadcast")) {
    return (
      `💡 **Draf Pesan Promosi WhatsApp Pelanggan:**\n\n` +
      `*Halo Kak [Nama Pelanggan]! 👋*\n\n` +
      `Musim hujan bikin jemuran susah kering dan bau apek? Jangan khawatir! 🌧️✨\n\n` +
      `*${context.outletName}* siap bikin pakaian keluarga kembali bersih, wangi segar, dan rapi siap pakai. Nikmati promo spesial:\n\n` +
      `🎉 *Diskon 10% Cuci Komplit Kiloan*\n` +
      `⏰ Berlaku hingga akhir minggu ini!\n\n` +
      `Yuk antar cucian Kakak sekarang ke outlet kami, atau balas pesan ini untuk info layanan. Terima kasih! 🌸`
    );
  }

  // Default Guidance Response disesuaikan dengan Role
  if (isStaff) {
    return (
      `Halo! Saya **Cleanique AI Copilot** untuk Staf Kasir **${context.outletName}** 🧺✨\n\n` +
      `Saya dapat memandu Anda menguasai meja kasir:\n\n` +
      `• 🛒 **Alur Kasir (POS)**: Cara buat nota baru, pilih paket kiloan/satuan, dan pelunasan.\n` +
      `• 🧺 **Status Cucian**: 6 tahapan cucian dari diterima sampai siap diambil.\n` +
      `• 🖨️ **Struk Thermal**: Format cetak struk 58mm & 80mm.\n` +
      `• 💵 **Shift Kasir**: Cara buka shift uang modal awal & tutup shift bebas selisih.\n` +
      `• 👥 **Pelanggan**: Cek data pelanggan & info resi mandiri.\n` +
      `• 🧼 **Tips Noda Pakaian**: Solusi praktis noda tinta, darah, minyak, dll.\n\n` +
      `Silakan tanyakan seputar operasional meja kasir!`
    );
  }

  return (
    `Halo! Saya **Cleanique AI Copilot** untuk **${context.outletName}** 🧺✨\n\n` +
    `Saya dapat memandu Anda menguasai seluruh fitur dashboard ini:\n\n` +
    `• 🧭 **Panduan Menu**: Tanyakan fungsi menu Kasir, Buku Kas, Layanan, Pelanggan, atau Laporan.\n` +
    `• ⚙️ **Pengaturan**: Cara atur Jam Buka Toko, Rekening Bank & QRIS, dan Tambah Kasir.\n` +
    `• 📲 **WhatsApp Gateway**: Cara scan QR Baileys agar struk otomatis terkirim.\n` +
    `• 💵 **Shift Kasir**: Cara buka & tutup shift kasir agar uang laci tidak selisih.\n` +
    `• 📊 **Ringkasan Toko**: Cek omset dan cucian tertunda hari ini.\n` +
    `• 🧼 **Tips Noda Pakaian**: Solusi noda tinta, darah, minyak, luntur, dll.\n\n` +
    `Silakan tanyakan hal apa pun yang ingin Anda ketahui!`
  );
}
