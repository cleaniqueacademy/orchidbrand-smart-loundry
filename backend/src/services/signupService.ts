import { db } from "../db/index";
import {
  users,
  tenants,
  services,
  waNumbers,
  signupRequests,
  platformSettings,
  subscriptionEvents,
  plans,
} from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays, today } from "../utils/date";
import { DEFAULT_PRESET_SERVICES } from "../constants/services";
import { validateCode, recordSignup } from "./referralService";

export interface SignupInput {
  outletName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  city?: string;
  address?: string;
  referralCode?: string;
  planId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignupResult {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    tenantId: string;
    outletName: string;
    ownerName: string;
    email: string;
    phone: string;
    trialDays: number;
    subscriptionUntil: string;
    referralCode?: string | null;
  };
}

/**
 * Validasi ketersediaan email
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
  return existing.length === 0;
}

/**
 * Validasi ketersediaan nomor telepon
 */
export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const cleanPhone = phone.trim();
  const existing = await db.select().from(tenants).where(eq(tenants.phone, cleanPhone));
  return existing.length === 0;
}

/**
 * Orkestrasi pendaftaran mandiri (self-signup) outlet baru:
 * 1. Validasi input & cek keunikan email & phone
 * 2. Validasi kode referral jika diisi
 * 3. Ambil setting platform (durasi trial default)
 * 4. Buat user (role tenant_owner, isTrial=true)
 * 5. Buat tenant (isTrial=true, status=active, subscriptionUntil=H+trial)
 * 6. Seed preset services default
 * 7. Inisialisasi wa_numbers primer
 * 8. Catat referral signup event (jika ada ref code)
 * 9. Catat subscription event (trial_started)
 * 10. Catat dan tandai signup_requests selesai
 */
export async function registerNewTenant(input: SignupInput): Promise<SignupResult> {
  const {
    outletName,
    ownerName,
    phone,
    email,
    password,
    city = "Kota",
    address = "Alamat Outlet",
    referralCode,
    planId,
    ipAddress,
    userAgent,
  } = input;

  if (!outletName || !ownerName || !phone || !email || !password) {
    return {
      success: false,
      message: "Nama outlet, nama pemilik, nomor WhatsApp, email, dan password wajib diisi.",
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();

  // 1. Cek email
  const emailAvail = await isEmailAvailable(cleanEmail);
  if (!emailAvail) {
    return {
      success: false,
      message: "Email sudah terdaftar. Silakan login atau gunakan email lain.",
    };
  }

  // 2. Validasi kode referral jika diisi (Safe fallback: jika tidak valid/kedaluwarsa, tetap izinkan daftar tanpa error 400)
  let validReferralCodeId: string | null = null;
  let marketingUserId: string | null = null;
  let referralNotice: string | null = null;
  if (referralCode && referralCode.trim()) {
    const valRes = await validateCode(referralCode.trim());
    if (valRes.valid && valRes.code) {
      validReferralCodeId = valRes.code.id;
      // Jika kode terhubung ke marketing profile, ambil marketing user id
      if (valRes.code.marketingProfileId) {
        marketingUserId = valRes.code.marketingProfileId;
      }
    } else {
      referralNotice = valRes.message || "Kode referral tidak valid atau sudah kedaluwarsa. Pendaftaran dilanjutkan dengan akun reguler.";
    }
  }

  // 3. Ambil durasi trial dari platform_settings (default 7 hari)
  let trialDays = 7;
  const [settings] = await db.select().from(platformSettings).limit(1);
  if (settings && settings.defaultTrialDays) {
    trialDays = settings.defaultTrialDays;
  }

  const todayIso = today();
  const subscriptionUntil = addDays(trialDays);
  const nowIso = new Date().toISOString();

  // 4. Hash password
  const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });

  const userId = newId("usr");
  const tenantId = newId("tenant");
  const signupRequestId = newId("sgn");

  // 5. Buat User dahulu (karena tenants.user_id mereferensikan users.id)
  await db.insert(users).values({
    id: userId,
    name: ownerName.trim(),
    email: cleanEmail,
    passwordHash,
    role: "tenant_owner",
    status: "active",
    subscriptionUntil,
    tenantId,
    isTrial: "true",
    signupRequestId,
    marketingUserId,
    createdAt: nowIso,
  });

  // 6. Buat Tenant (karena signup_requests.created_tenant_id mereferensikan tenants.id)
  await db.insert(tenants).values({
    id: tenantId,
    userId,
    outletName: outletName.trim(),
    phone: cleanPhone,
    address: address.trim(),
    city: city.trim(),
    status: "active",
    subscriptionUntil,
    waMode: "manual",
    enableCashierShift: "true",
    isTrial: "true",
    source: validReferralCodeId ? "referral" : "signup",
    referralCodeId: validReferralCodeId,
    acquiredAt: nowIso,
    createdAt: nowIso,
  });

  // 7. Simpan signup request (setelah user dan tenant ada di DB)
  await db.insert(signupRequests).values({
    id: signupRequestId,
    outletName: outletName.trim(),
    ownerName: ownerName.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    city: city.trim(),
    address: address.trim(),
    referralCode: referralCode ? referralCode.trim().toUpperCase() : null,
    referralCodeId: validReferralCodeId,
    planId: planId || null,
    status: "activated",
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    createdTenantId: tenantId,
    createdUserId: userId,
    activatedAt: nowIso,
    createdAt: nowIso,
  });

  // 8. Seed Preset Services Default
  const servicesToInsert = DEFAULT_PRESET_SERVICES.map((s) => ({
    id: newId("srv"),
    tenantId,
    name: s.name,
    unit: s.unit,
    pricePerUnit: s.pricePerUnit,
    minOrder: s.minOrder,
    durationHours: s.durationHours,
    status: "active",
    createdAt: nowIso,
  }));

  if (servicesToInsert.length > 0) {
    await db.insert(services).values(servicesToInsert);
  }

  // 9. Inisialisasi wa_numbers Primer
  await db.insert(waNumbers).values({
    id: newId("wanum"),
    tenantId,
    sessionKey: tenantId, // Primary session key = tenantId untuk kompatibilitas
    label: "Kasir Utama",
    phoneNumber: cleanPhone,
    isPrimary: "true",
    botEnabled: "false",
    aiEnabled: "false",
    status: "disconnected",
    createdAt: nowIso,
  });

  // 10. Catat referral signup jika menggunakan kode promo
  if (validReferralCodeId) {
    await recordSignup(validReferralCodeId, tenantId, {
      outletName,
      ownerName,
      email: cleanEmail,
      phone: cleanPhone,
    });
  }

  // 11. Catat subscription event (trial_started)
  await db.insert(subscriptionEvents).values({
    id: newId("subevt"),
    tenantId,
    eventType: "trial_started",
    eventDate: todayIso,
    messageSent: `Trial ${trialDays} hari aktif hingga ${subscriptionUntil}`,
    metadata: JSON.stringify({
      trialDays,
      subscriptionUntil,
      referralCodeId: validReferralCodeId,
    }),
    createdAt: nowIso,
  });

  return {
    success: true,
    message: referralNotice
      ? `Pendaftaran berhasil! Akun Anda aktif dengan masa trial gratis ${trialDays} hari. (${referralNotice})`
      : `Pendaftaran berhasil! Akun Anda aktif dengan masa trial gratis ${trialDays} hari.`,
    data: {
      userId,
      tenantId,
      outletName: outletName.trim(),
      ownerName: ownerName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      trialDays,
      subscriptionUntil,
      referralCode: validReferralCodeId ? (referralCode?.trim().toUpperCase() || null) : null,
      referralNotice,
    },
  };
}
