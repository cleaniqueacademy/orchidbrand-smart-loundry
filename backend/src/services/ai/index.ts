import { ChatOptions, AIResponse } from "./types";
import { getOperationalContext } from "./contextService";
import { generateLocalFallbackReply } from "./localKnowledgeEngine";
import { callGoogleGemini } from "./googleProvider";
import { callAiveneWithFallback } from "./aiveneProvider";
import { checkRoleAccessViolation, sanitizeResponseForRole } from "./rbacGuard";

export * from "./types";
export { getOperationalContext } from "./contextService";
export { generateLocalFallbackReply } from "./localKnowledgeEngine";
export { callGoogleGemini } from "./googleProvider";
export { callAiveneAPI, callAiveneWithFallback } from "./aiveneProvider";
export { checkRoleAccessViolation, sanitizeResponseForRole } from "./rbacGuard";

/**
 * Main Controller: Asisten Operasional & Panduan Dashboard In-Web
 * Mengutamakan Google Gemini (Interactions API / @google/genai)
 * Fallback 1: Aivene AI Gateway (gemini-3.8-flash, gemini-3.7-flash, dst.)
 * Fallback 2: Local Knowledge Engine (offline & andal)
 */
export async function askLaundryAssistant(options: ChatOptions): Promise<AIResponse> {
  const { message, tenantId, user, history = [] } = options;

  const context = await getOperationalContext(tenantId);
  const userRole = user.role || "staff";

  // =========================================================================
  // STEP 0: STRICT DETERMINISTIC RBAC PRE-GUARD
  // TOLAK LANGSUNG JIKA BUKAN DI RANAH ROLE APLIKASI PENGGUNA!
  // Khususnya: Kasir dilarang menanyakan fitur/wewenang Admin, Owner, Settings, Finansial.
  // =========================================================================
  const rbacViolation = checkRoleAccessViolation(message, userRole, context);
  if (rbacViolation) {
    return {
      reply: rbacViolation.reply,
      model: "cleanique-rbac-policy-guard",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const aiveneApiKey = process.env.AIVENE_API_KEY?.trim();

  // Mode pengujian otomatis (unit & integration tests)
  if (process.env.NODE_ENV === "test") {
    const localReply = generateLocalFallbackReply(message, context, userRole);
    return {
      reply: localReply,
      model: "test-local-engine",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  // Jika kedua API Key belum disetel, gunakan mesin pengetahuan lokal
  if (!geminiApiKey && !aiveneApiKey) {
    const localReply = generateLocalFallbackReply(message, context, userRole);
    return {
      reply: localReply,
      model: "cleanique-dashboard-copilot (Local Knowledge Engine)",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  const systemPrompt = `
Kamu adalah **Cleanique AI Copilot** — asisten operasional cerdas, ramah, dan profesional untuk aplikasi "Laundry Cleanique".
Pengguna yang sedang berbicara denganmu memiliki peran: **${userRole}** (${userRole === "tenant_owner" ? "Pemilik Outlet / Franchisee" : userRole === "superadmin" ? "Super Admin Platform Pusat" : "Staf Kasir"}).

DATA OPERASIONAL OUTLET SAAT INI (${context.todayStr}):
- Nama Outlet: ${context.outletName}
- Pesanan Masuk Hari Ini: ${context.ordersTodayCount} pesanan
- Omset Masuk Lunas Hari Ini: Rp ${context.revenueToday.toLocaleString("id-ID")}
- Antrian Cucian Sedang Diproses: ${context.processCount} pesanan
- Cucian Selesai & Siap Diambil: ${context.readyCount} pesanan
- Pesanan Belum Lunas (Piutang): ${context.unpaidCount} pesanan

PANDUAN PENGETAHUAN MENU & PENGATURAN DASHBOARD:
1. **Menu Overview (overview)**: Dashboard ringkasan harian, antrian cucian siap diserahkan, statistik omset, dan kartu status shift kasir.
2. **Menu Kasir (orders)**: Meja kasir POS. Input pesanan baru kiloan/satuan, item jamak, estimasi SLA pengerjaan, pendaftaran pelanggan baru instan, pelunasan cepat (Tunai, QRIS, Transfer), cetak struk thermal (58mm/80mm) ber-QR Code resi publik, dan update 6 status cucian (process ➔ washing ➔ drying_ironing ➔ ready ➔ completed / cancelled).
3. **Menu Layanan (services)**: Master tarif & durasi pengerjaan outlet. Tambah/edit layanan kiloan, satuan (Bedcover, Jas, Sepatu, Karpet), minimal order, dan SLA jam.
4. **Menu Buku Kas (cashflow)**: Arus kas toko. Catat pengeluaran harian toko (deterjen, listrik, parfum, gaji), rekap uang masuk lunas, dan penghitungan laba bersih outlet.
5. **Menu Pelanggan (customers)**: Database kontak pelanggan, nomor WhatsApp, riwayat transaksi, dan tombol chat WA langsung.
6. **Menu Langganan (subscription)**: Informasi masa aktif lisensi cabang, perpanjangan paket, input kode referral diskon, dan upload bukti transfer bank ke pusat.
7. **Menu Laporan (reports)**: Rekapitulasi finansial, ekspor spreadsheet CSV (Excel), dan cetak PDF laporan resmi ber-kop outlet.
8. **Menu Pengaturan (settings)**: Pusat konfigurasi outlet:
   - Profil Cabang (nama, nomor HP WA, alamat, kota).
   - Jam Operasional Outlet (Senin-Jumat, Sabtu, Minggu) yang otomatis tercetak di struk nota dan pesan WhatsApp.
   - Rekening Bank & QRIS untuk instruksi bayar transfer di struk kasir.
   - WhatsApp Gateway Baileys (mode otomatis scan QR di web vs mode manual wa.me).
   - Manajemen Staf Kasir (tambah user kasir, reset password staf).
   - Opsi aktifkan / nonaktifkan fitur Shift Kasir.
9. **Menu Superadmin (Pusat)**: Cabang (tenants), Pengguna (users), Pendaftar Mandiri (signups), Master Paket & Harga (plans), Verifikasi Tagihan (invoices), Mitra Marketing & Kode Referral (marketing & referral_codes), Setting Platform (settings_platform), dan Audit Log (logs).
10. **Shift Kasir**: Buka shift dengan uang modal awal kasir di laci kas, tutup shift dengan rekonsiliasi uang fisik bebas selisih kasir.

ATURAN FITUR SMART ACTION TAGS:
Jika penjelasanmu menyarankan pengguna membuka menu atau jendela modal tertentu, sertakan salah satu tag berikut di akhir jawabanmu:
- [ACTION:NAVIGATE:settings] (jika membahas pengaturan toko, jam buka, rekening bank, atau staf)
- [ACTION:NAVIGATE:orders] (jika membahas kasir, buat order, cetak struk, atau status cucian)
- [ACTION:NAVIGATE:cashflow] (jika membahas buku kas, pengeluaran toko, atau laba bersih)
- [ACTION:NAVIGATE:services] (jika membahas master tarif, tambah layanan, atau SLA)
- [ACTION:NAVIGATE:customers] (jika membahas kontak pelanggan atau cek riwayat)
- [ACTION:NAVIGATE:subscription] (jika membahas sisa masa aktif atau perpanjang langganan)
- [ACTION:NAVIGATE:reports] (jika membahas ekspor Excel atau cetak PDF laporan)
- [ACTION:OPEN_MODAL:whatsapp] (jika membahas scan QR WhatsApp atau koneksi Baileys)
- [ACTION:OPEN_MODAL:open_shift] (jika membahas cara buka shift kasir)
- [ACTION:OPEN_MODAL:close_shift] (jika membahas cara tutup shift kasir)

ATURAN KETAT HAK AKSES PERAN (ROLE-BASED ACCESS CONTROL):
Peran pengguna yang sedang berbicara saat ini adalah: **${userRole}**.

1. JIKA PERAN ADALAH "staff" (Staf Kasir):
- Ranah yang BOLEH dijawab:
  * Meja Kasir POS: input order baru kiloan/satuan, cek dan ubah status cucian, cetak struk thermal 58mm/80mm, pelunasan nota.
  * Shift Kasir: buka shift kasir dengan modal awal, tutup shift kasir dengan rekonsiliasi uang fisik laci.
  * Data Pelanggan: kontak pelanggan dan pencarian resi publik.
  * Tips Perawatan Laundry: solusi pembersihan noda (tinta, minyak, darah, dll), teknik mencuci dan setrika.
- Ranah yang DILARANG KERAS DIJAWAB / WAJIB DITOLAK:
  * Pengaturan outlet (jam operasional toko, profil cabang).
  * Rekening bank outlet & QRIS toko.
  * Tambah/edit staf kasir baru atau reset password kasir.
  * Pengaturan WhatsApp Gateway / Scan QR Baileys.
  * Buku Kas, catat pengeluaran toko, laporan laba bersih.
  * Laporan Finansial, cetak PDF resmi, ekspor Excel.
  * Langganan lisensi outlet, tagihan, perpanjang paket.
  * Seluruh fitur Super Admin Platform Pusat (Cabang/Tenants, Users, Master Paket, Mitra Marketing, Platform Settings).
- CARA MENOLAK UNTUK STAF KASIR:
  Jika Staf Kasir bertanya tentang hal-hal di atas, TOLAK dengan sopan dan tegas:
  "Maaf, sebagai Staf Kasir, Anda tidak memiliki akses ke fitur atau informasi [Nama Fitur]. Fitur ini merupakan wewenang khusus Pemilik Outlet (Owner) atau Super Admin. Silakan hubungi pemilik outlet Anda jika memerlukan bantuan terkait hal ini."
  JANGAN memberikan langkah-langkah atau menyertakan ACTION tag ke menu yang dilarang!

2. JIKA PERAN ADALAH "tenant_owner" atau "owner" (Pemilik Outlet):
- Berwenang atas seluruh operasional outlet miliknya: Meja Kasir, Shift, Buku Kas & Pengeluaran Toko, Tarif Layanan, Pelanggan, Laporan Finansial, Pengaturan Outlet (Jam buka, Rekening/QRIS, WhatsApp Gateway, Staf), dan Perpanjangan Langganan.
- Dilarang mengakses fitur Super Admin Pusat (kelola cabang lain, pengguna platform lain, master paket pusat). Tolak dengan: "Menu tersebut merupakan wewenang khusus Super Admin Cleanique Pusat."

3. JIKA PERAN ADALAH "marketing" (Mitra Marketing):
- Hanya berwenang atas dashboard referral miliknya, statistik klik, dan riwayat komisi. Dilarang mengakses meja kasir atau data toko.

4. JIKA PERAN ADALAH "superadmin":
- Memiliki wewenang penuh atas seluruh fitur platform dan operasional outlet.

GAYA MENJAWAB:
- Jawab dalam Bahasa Indonesia yang ramah, sopan, terstruktur rapi (bullet points, bold text).
- Taati batasan peran di atas tanpa pengecualian!
`.trim();

  let lastError: Error | null = null;

  // 1. Coba Google Gemini API (@google/genai Interactions API & tools)
  if (geminiApiKey) {
    try {
      const { text, modelName } = await callGoogleGemini(
        geminiApiKey,
        systemPrompt,
        message,
        history
      );
      const sanitizedReply = sanitizeResponseForRole(text, userRole);
      return {
        reply: sanitizedReply,
        model: modelName,
        contextSummary: {
          outletName: context.outletName,
          ordersToday: context.ordersTodayCount,
          revenueToday: context.revenueToday,
          pendingOrders: context.processCount,
          readyOrders: context.readyCount,
        },
      };
    } catch (geminiErr: any) {
      lastError = geminiErr;
      console.warn(`[AI Assistant] Google Gemini gagal, mengalihkan ke fallback Aivene:`, geminiErr.message);
    }
  }

  // 2. Fallback ke Aivene AI Gateway (gemini-3.8-flash, gemini-3.7-flash, dsb.)
  if (aiveneApiKey) {
    console.info("[AI Assistant] Mengalihkan ke Fallback Aivene AI Gateway...");
    try {
      const { text, modelName } = await callAiveneWithFallback(
        aiveneApiKey,
        systemPrompt,
        message,
        history
      );
      const sanitizedReply = sanitizeResponseForRole(text, userRole);
      return {
        reply: sanitizedReply,
        model: modelName,
        contextSummary: {
          outletName: context.outletName,
          ordersToday: context.ordersTodayCount,
          revenueToday: context.revenueToday,
          pendingOrders: context.processCount,
          readyOrders: context.readyCount,
        },
      };
    } catch (aiveneErr: any) {
      lastError = aiveneErr;
      console.warn(`[AI Assistant] Aivene Gateway gagal:`, aiveneErr.message);
    }
  }

  // 3. Fallback terakhir: Mesin pengetahuan lokal offline
  console.error("[AI Assistant] Seluruh provider AI cloud gagal:", lastError?.message);
  const localReply = generateLocalFallbackReply(message, context, userRole);
  return {
    reply: `${localReply}\n\n*(Catatan: Menggunakan mode pengetahuan lokal karena koneksi AI cloud sedang sibuk)*`,
    model: "cleanique-dashboard-copilot (Local Knowledge Engine)",
    contextSummary: {
      outletName: context.outletName,
      ordersToday: context.ordersTodayCount,
      revenueToday: context.revenueToday,
      pendingOrders: context.processCount,
      readyOrders: context.readyCount,
    },
  };
}
