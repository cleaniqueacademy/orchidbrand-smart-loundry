import { User } from "../types";

export interface UserActiveStatus {
  isActive: boolean;
  isExpired: boolean;
  isInactiveStatus: boolean;
  daysRemaining: number;
  formattedExpiry: string;
  statusBadge: {
    label: string;
    className: string;
    dotColor: string;
    description: string;
  };
}

/**
 * Memeriksa apakah akun pengguna aktif atau kedaluwarsa/nonaktif
 */
export function checkUserActiveStatus(user: User | null | undefined): UserActiveStatus {
  if (!user) {
    return {
      isActive: false,
      isExpired: false,
      isInactiveStatus: true,
      daysRemaining: 0,
      formattedExpiry: "—",
      statusBadge: {
        label: "Belum Login",
        className: "bg-zinc-100 text-zinc-600 border-zinc-200",
        dotColor: "bg-zinc-400",
        description: "Silakan login terlebih dahulu",
      },
    };
  }

  // Super Admin selalu aktif dan permanen
  if (user.role === "superadmin") {
    return {
      isActive: true,
      isExpired: false,
      isInactiveStatus: false,
      daysRemaining: 99999,
      formattedExpiry: "Permanen",
      statusBadge: {
        label: "Permanen",
        className: "bg-blue-900 text-white border-blue-900",
        dotColor: "bg-sky-400",
        description: "Akses Super Admin selalu aktif tanpa batasan waktu",
      },
    };
  }

  const isInactiveStatus = user.status === "inactive";
  let isExpired = false;
  let daysRemaining = 0;
  let formattedExpiry = "Tidak Ditentukan";

  if (user.subscriptionUntil) {
    // Gunakan batas akhir hari (23:59:59) untuk tanggal yang tertera
    const expDate = new Date(`${user.subscriptionUntil}T23:59:59`);
    if (!isNaN(expDate.getTime())) {
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isExpired = diffMs < 0;

      formattedExpiry = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(expDate);
    }
  }

  // Pengguna aktif jika tidak berstatus nonaktif DAN masa aktif belum expired
  const isActive = !isInactiveStatus && !isExpired;

  let badge = {
    label: "Aktif",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-500",
    description: `Masa aktif berlaku hingga ${formattedExpiry}`,
  };

  if (isInactiveStatus) {
    badge = {
      label: "Nonaktif",
      className: "bg-rose-50 text-rose-800 border-rose-200",
      dotColor: "bg-rose-500",
      description: "Akun dinonaktifkan oleh Administrator",
    };
  } else if (isExpired) {
    badge = {
      label: "Kedaluwarsa",
      className: "bg-rose-50 text-rose-700 border-rose-300 animate-pulse",
      dotColor: "bg-rose-600",
      description: `Masa aktif telah berakhir pada ${formattedExpiry}`,
    };
  } else if (daysRemaining <= 7) {
    badge = {
      label: `Sisa ${daysRemaining} Hari`,
      className: "bg-amber-50 text-amber-800 border-amber-300",
      dotColor: "bg-amber-500",
      description: `Masa aktif segera berakhir dalam ${daysRemaining} hari`,
    };
  } else {
    badge = {
      label: "Aktif",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dotColor: "bg-emerald-500",
      description: `Aktif ${daysRemaining} hari ke depan hingga ${formattedExpiry}`,
    };
  }

  return {
    isActive,
    isExpired,
    isInactiveStatus,
    daysRemaining,
    formattedExpiry,
    statusBadge: badge,
  };
}

/**
 * Menghitung preview tanggal perpanjangan masa aktif
 */
export function calculateExtendedDate(
  currentSubscriptionUntil: string | null | undefined,
  daysToAdd: number
): {
  newDateStr: string;
  isFromCurrent: boolean;
  formattedNewDate: string;
} {
  const days = Number(daysToAdd) || 0;
  let baseDate = new Date();
  let isFromCurrent = false;

  if (currentSubscriptionUntil) {
    const currentExp = new Date(`${currentSubscriptionUntil}T23:59:59`);
    if (!isNaN(currentExp.getTime()) && currentExp > new Date()) {
      baseDate = new Date(currentSubscriptionUntil);
      isFromCurrent = true;
    }
  }

  baseDate.setDate(baseDate.getDate() + days);
  const newDateStr = baseDate.toISOString().slice(0, 10);

  const formattedNewDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(baseDate);

  return {
    newDateStr,
    isFromCurrent,
    formattedNewDate,
  };
}

/**
 * Nomor kontak WhatsApp Admin Pusat Laundry Cleanique
 */
export const DEFAULT_ADMIN_PHONE = "081234567890";

/**
 * Menghasilkan link WhatsApp langsung ke Admin untuk permohonan perpanjangan akun
 */
export function getAdminWhatsAppUrl(
  user: {
    name?: string;
    email?: string;
    tenantName?: string | null;
    subscriptionUntil?: string | null;
  },
  adminPhone: string = DEFAULT_ADMIN_PHONE
): string {
  const cleanPhone = adminPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  const userName = user.name || "Pengguna Laundry";
  const userEmail = user.email || "—";
  const outletName = user.tenantName || "Cabang Laundry";
  const expDateStr = user.subscriptionUntil
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${user.subscriptionUntil}T23:59:59`))
    : "Sudah Berakhir";

  const message =
    `Halo Admin Laundry Cleanique 👋\n\n` +
    `Saya ingin mengajukan permohonan *Perpanjangan Masa Aktif* untuk akun sistem kasir kami:\n\n` +
    `👤 *Nama Pengguna:* ${userName}\n` +
    `🏪 *Outlet / Cabang:* ${outletName}\n` +
    `📧 *Email Akun:* ${userEmail}\n` +
    `⏳ *Batas Masa Aktif:* ${expDateStr}\n\n` +
    `Mohon bantuan Bapak/Ibu Admin untuk memperpanjang masa aktif akun ini agar operasional kasir laundry kami dapat terus berjalan lancar. Terima kasih banyak! 🙏✨`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
