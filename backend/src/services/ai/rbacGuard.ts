import { OperationalContext } from "./types";

export interface RBACCheckResult {
  isForbidden: boolean;
  reason: string;
  reply: string;
}

/**
 * Memeriksa apakah pesan pengguna melanggar batasan hak akses peran (RBAC).
 *
 * ATURAN MUTLAK:
 * 1. Kasir ('staff' / 'kasir'): TIDAK BOLEH menanyakan atau mendapatkan jawaban seputar:
 *    - Admin, Super Admin, Owner, wewenang/privilese admin
 *    - Pengaturan Outlet, Jam Buka/Operasional, Profil Toko
 *    - Rekening Bank & QRIS Outlet
 *    - Manajemen Staf (tambah kasir, ganti/reset password, edit/hapus kasir)
 *    - WhatsApp Gateway Baileys (scan QR)
 *    - Buku Kas, Pengeluaran Toko, Arus Kas, Omset Toko, Laba Bersih, Kerugian, Laporan Finansial, Ekspor Excel/PDF
 *    - Master Tarif / Ubah Harga Layanan
 *    - Tagihan, Invoice, Paket Langganan Outlet, Cabang Lain
 * 2. Pemilik Outlet ('tenant_owner'): TIDAK BOLEH mengakses fitur Superadmin platform pusat.
 * 3. Mitra Marketing ('marketing'): HANYA BOLEH mengakses seputar referral & komisi.
 */
export function checkRoleAccessViolation(
  message: string,
  role: string,
  context: OperationalContext
): RBACCheckResult | null {
  const lower = message.toLowerCase().trim();
  const normalizedRole = (role || "staff").toLowerCase();
  const isStaff =
    normalizedRole === "staff" ||
    normalizedRole === "kasir" ||
    normalizedRole === "cashier";
  const isOwner =
    normalizedRole === "tenant_owner" ||
    normalizedRole === "owner";
  const isMarketing = normalizedRole === "marketing";

  // =========================================================================
  // 1. STAF KASIR (STAFF / KASIR): BLOKIR JIKA BERTANYA DI LUAR RANAH KASIR
  // =========================================================================
  if (isStaff) {
    // 1.1 Menanyakan tentang Admin, Super Admin, Owner, atau Wewenang Admin
    const askingAboutAdmin =
      /\b(admin|superadmin|owner|pemilik|hak akses|wewenang|privilese)\b/i.test(lower) ||
      lower.includes("tentang admin") ||
      lower.includes("tengtang admin") ||
      lower.includes("menu admin") ||
      lower.includes("fitur admin") ||
      lower.includes("tugas admin") ||
      lower.includes("akun admin") ||
      lower.includes("login admin") ||
      lower.includes("jadi admin") ||
      lower.includes("akses admin") ||
      lower.includes("nanya tentang admin") ||
      lower.includes("nanya tengtang admin") ||
      lower.includes("bisa jadi admin") ||
      lower.includes("dashboard admin");

    if (askingAboutAdmin) {
      return {
        isForbidden: true,
        reason: "Pertanyaan mengenai wewenang atau informasi Admin dilarang untuk role Kasir.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, Anda login sebagai **Staf Kasir**. Pertanyaan mengenai fitur, menu, atau hak akses **Admin / Pemilik Outlet** tidak diizinkan untuk peran Anda.\n\n` +
          `🔒 Fitur-fitur administratif tersebut dikhususkan untuk **Pemilik Outlet (Owner)** atau **Super Admin**.\n\n` +
          `🧺 **Ranah tugas Anda sebagai Staf Kasir:**\n` +
          `• **Meja Kasir POS**: Buat pesanan kiloan/satuan, cetak struk nota, pelunasan pembayaran, dan pembaruan status cucian\n` +
          `• **Shift Kasir**: Buka shift kerja (modal awal laci) dan tutup shift kerja (setoran uang fisik)\n` +
          `• **Data Pelanggan**: Pencarian kontak pelanggan dan pelacakan resi nota\n` +
          `• **Perawatan Cucian**: Penanganan berbagai jenis noda pakaian dan estimasi SLA\n\n` +
          `Silakan tanyakan hal-hal yang berkaitan dengan operasional meja kasir harian!`,
      };
    }

    // 1.2 Menanyakan WhatsApp Gateway (Scan QR Baileys)
    if (
      lower.includes("whatsapp") ||
      lower.includes("wa gateway") ||
      lower.includes("baileys") ||
      lower.includes("scan qr") ||
      lower.includes("qr wa") ||
      lower.includes("koneksi wa") ||
      lower.includes("hubungkan wa")
    ) {
      return {
        isForbidden: true,
        reason: "Konfigurasi WhatsApp Gateway Baileys hanya untuk Pemilik Outlet.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, Anda login sebagai **Staf Kasir**. Konfigurasi koneksi **WhatsApp Gateway (Scan QR Baileys)** hanya dapat dilakukan oleh **Pemilik Outlet (Owner)** melalui menu Pengaturan.\n\n` +
          `Jika pengiriman pesan WhatsApp struk otomatis mengalami kendala, silakan beritahu pemilik outlet Anda.`,
      };
    }

    // 1.3 Menanyakan Pengaturan Toko, Jam Buka, Rekening/QRIS, Manajemen Staf
    const askingAboutSettingsOrStaff =
      lower.includes("setting") ||
      lower.includes("pengaturan") ||
      lower.includes("konfigurasi") ||
      lower.includes("setup") ||
      lower.includes("jam buka") ||
      lower.includes("jam operasional") ||
      lower.includes("jam kerja") ||
      lower.includes("jam tutup") ||
      lower.includes("rekening") ||
      lower.includes("qris") ||
      lower.includes("bank") ||
      lower.includes("tambah kasir") ||
      lower.includes("tambah staf") ||
      lower.includes("tambah user") ||
      lower.includes("buat user") ||
      lower.includes("edit kasir") ||
      lower.includes("hapus kasir") ||
      lower.includes("ganti password") ||
      lower.includes("reset password") ||
      lower.includes("manajemen staf") ||
      lower.includes("kelola staf") ||
      lower.includes("daftar user");

    // Pengecualian khusus: pertanyaan cetak struk kasir yang tidak mengandung setting toko/rekening/jam/user
    const isPureReceiptQuery =
      (lower.includes("printer") || lower.includes("struk") || lower.includes("thermal")) &&
      !lower.includes("setting") &&
      !lower.includes("pengaturan") &&
      !lower.includes("rekening") &&
      !lower.includes("jam") &&
      !lower.includes("kasir baru") &&
      !lower.includes("password");

    if (askingAboutSettingsOrStaff && !isPureReceiptQuery) {
      return {
        isForbidden: true,
        reason: "Pengaturan outlet dan manajemen staf merupakan wewenang Pemilik Outlet.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, Anda login sebagai **Staf Kasir**. Anda tidak memiliki hak akses untuk mengelola **Pengaturan Outlet, Jam Operasional, Rekening Bank/QRIS, maupun Manajemen Staf/Password**.\n\n` +
          `🔒 Fitur-fitur ini merupakan wewenang khusus **Pemilik Outlet (Owner)**.\n` +
          `Silakan hubungi pemilik outlet Anda jika ada perubahan data atau pengaturan toko yang diperlukan.`,
      };
    }

    // 1.4 Menanyakan Buku Kas, Pengeluaran Toko, Laba Bersih, Omset Toko, Laporan Finansial
    const askingAboutFinances =
      lower.includes("buku kas") ||
      lower.includes("arus kas") ||
      lower.includes("pengeluaran") ||
      lower.includes("biaya toko") ||
      lower.includes("laba") ||
      lower.includes("rugi") ||
      lower.includes("omset") ||
      lower.includes("omzet") ||
      lower.includes("pendapatan") ||
      lower.includes("keuntungan toko") ||
      lower.includes("total uang masuk") ||
      lower.includes("laporan keuangan") ||
      lower.includes("ekspor excel") ||
      lower.includes("export csv") ||
      lower.includes("cetak pdf laporan") ||
      (lower.includes("laporan") && !lower.includes("nota") && !lower.includes("struk"));

    if (askingAboutFinances) {
      return {
        isForbidden: true,
        reason: "Buku kas, omset toko, dan laporan finansial bersifat rahasia untuk Pemilik Outlet.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, data **Buku Kas, Pengeluaran Toko, Omset Toko, Laba Bersih, dan Laporan Finansial** bersifat rahasia dan hanya dapat diakses oleh **Pemilik Outlet (Owner)**.\n\n` +
          `Untuk keperluan kas kasir, silakan gunakan fitur **Shift Kasir** untuk mencatat modal awal dan setoran tunai giliran kerja Anda.\n\n` +
          `[ACTION:OPEN_MODAL:open_shift]`,
      };
    }

    // 1.5 Menanyakan Master Layanan & Tarif (Ubah Harga)
    if (
      lower.includes("ubah harga") ||
      lower.includes("ganti harga") ||
      lower.includes("tambah layanan") ||
      lower.includes("edit layanan") ||
      lower.includes("hapus layanan") ||
      lower.includes("master tarif") ||
      lower.includes("master layanan")
    ) {
      return {
        isForbidden: true,
        reason: "Perubahan master tarif dan layanan merupakan wewenang Pemilik Outlet.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, perubahan **Master Tarif dan Harga Layanan Cucian** hanya dapat diatur oleh **Pemilik Outlet (Owner)** melalui menu Layanan.\n\n` +
          `Di meja kasir POS, Anda dapat memilih layanan cucian yang sudah terdaftar dengan tarif yang telah ditentukan oleh outlet.`,
      };
    }

    // 1.6 Menanyakan Langganan, Tagihan, atau Platform Pusat
    if (
      lower.includes("langganan") ||
      lower.includes("perpanjang") ||
      lower.includes("invoice") ||
      lower.includes("tagihan") ||
      lower.includes("paket lisensi") ||
      lower.includes("cabang lain") ||
      lower.includes("franchise") ||
      lower.includes("tenants") ||
      lower.includes("mitra marketing")
    ) {
      return {
        isForbidden: true,
        reason: "Langganan lisensi dan administrasi multi-cabang dikelola oleh Pemilik Outlet.",
        reply:
          `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
          `Maaf, status **Langganan Outlet, Tagihan Lisensi, dan Administrasi Platform** hanya dikelola oleh **Pemilik Outlet (Owner)**.\n\n` +
          `Silakan hubungi pemilik outlet Anda terkait administrasi langganan toko.`,
      };
    }
  }

  // =========================================================================
  // 2. PEMILIK OUTLET (OWNER): DILARANG MENANYAKAN SUPERADMIN PUSAT
  // =========================================================================
  if (isOwner) {
    if (
      lower.includes("superadmin") ||
      lower.includes("kelola cabang lain") ||
      lower.includes("semua cabang") ||
      lower.includes("semua tenant") ||
      lower.includes("platform settings") ||
      lower.includes("setting platform") ||
      lower.includes("master paket pusat") ||
      lower.includes("verifikasi tagihan pusat")
    ) {
      return {
        isForbidden: true,
        reason: "Fitur multi-cabang platform pusat dikhususkan untuk Super Admin Cleanique.",
        reply:
          `⛔ **Akses Terbatas (Role Pemilik Outlet):**\n\n` +
          `Fitur tersebut merupakan wewenang khusus **Super Admin Cleanique Pusat** untuk mengelola seluruh ekosistem platform multi-cabang.\n\n` +
          `Sebagai Pemilik Outlet, Anda memiliki kendali penuh atas operasional outlet **${context.outletName}**.`,
      };
    }
  }

  // =========================================================================
  // 3. MITRA MARKETING: HANYA BERWENANG ATAS REFERRAL & KOMISI
  // =========================================================================
  if (isMarketing) {
    if (
      lower.includes("kasir") ||
      lower.includes("order") ||
      lower.includes("pesanan") ||
      lower.includes("buku kas") ||
      lower.includes("setting") ||
      lower.includes("pengaturan") ||
      lower.includes("shift") ||
      lower.includes("laundry")
    ) {
      return {
        isForbidden: true,
        reason: "Mitra marketing hanya berwenang atas program referral.",
        reply:
          `⛔ **Akses Terbatas (Role Mitra Marketing):**\n\n` +
          `Akun Anda terdaftar sebagai **Mitra Marketing (Affiliate)**. Anda hanya memiliki akses ke dashboard referral, statistik tautan promosi, dan riwayat komisi Anda.\n\n` +
          `Operasional toko laundry dan meja kasir dikelola langsung oleh staf dan pemilik outlet masing-masing.`,
      };
    }
  }

  return null;
}

/**
 * Membersihkan respon jika model AI menghasilkan instruksi atau action tag
 * yang melanggar wewenang peran pengguna.
 */
export function sanitizeResponseForRole(reply: string, role: string): string {
  const normalizedRole = (role || "staff").toLowerCase();
  const isStaff =
    normalizedRole === "staff" ||
    normalizedRole === "kasir" ||
    normalizedRole === "cashier";

  if (isStaff) {
    // 1. Hapus action tags terlarang untuk staf kasir
    let cleaned = reply
      .replace(
        /\[ACTION:(NAVIGATE|OPEN_MODAL):(settings|cashflow|subscription|reports|whatsapp|expense)\]/g,
        ""
      )
      .trim();

    // 2. Jika model secara tidak sengaja mengarahkan kasir ke menu admin/setting/buku kas:
    const lower = cleaned.toLowerCase();
    if (
      (lower.includes("buka menu pengaturan") ||
        lower.includes("masuk ke menu settings") ||
        lower.includes("klik tab settings") ||
        lower.includes("buka menu buku kas") ||
        lower.includes("masuk ke menu langganan") ||
        lower.includes("tambah user kasir di pengaturan")) &&
      !cleaned.includes("⛔")
    ) {
      return (
        `⛔ **Akses Terbatas (Di Luar Ranah Peran Kasir)**\n\n` +
        `Maaf, sebagai **Staf Kasir**, Anda tidak memiliki akses ke menu Pengaturan atau Buku Kas. Tindakan tersebut merupakan wewenang khusus **Pemilik Outlet (Owner)**.\n\n` +
        `Silakan tanyakan hal-hal yang berkaitan dengan operasional meja kasir, transaksi pelanggan, shift, dan tips cucian.`
      );
    }

    return cleaned;
  }

  return reply;
}
