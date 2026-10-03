import React from "react";
import { X, ArrowRight } from "lucide-react";
import { Role } from "../../types";
import { ModalWrapper } from "./ModalWrapper";

export interface OnboardingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStartSpotlightTour?: () => void;
  currentUserRole?: Role;
  userName?: string;
  outletName?: string;
}

interface RoleTourConfig {
  badge: string;
  modalTitle: string;
  greetingText: (userName: string, outletName: string) => React.ReactNode;
  highlights: { title: string; desc: string }[];
}

const getRoleConfig = (role: Role = "staff"): RoleTourConfig => {
  if (role === "marketing") {
    return {
      badge: "Tour Tim Marketing IndoTech",
      modalTitle: "Mulai Tour Tim Marketing IndoTech?",
      greetingText: (userName) => (
        <span>
          Halo <strong className="text-slate-900">{userName}</strong>, selamat bergabung sebagai{" "}
          <strong className="text-slate-900">Tim Marketing IndoTech</strong>! Ikuti tour singkat
          (±1 menit) untuk menguasai alur pemantauan pendaftaran dan komisi Anda.
        </span>
      ),
      highlights: [
        {
          title: "Dashboard Marketing",
          desc: "Pantau total komisi, status pencairan, dan outlet aktif yang menggunakan kode Anda.",
        },
        {
          title: "Kode Referral Promo",
          desc: "Kelola dan bagikan kode kupon promo Anda untuk menarik pendaftaran outlet laundry baru.",
        },
        {
          title: "Pencairan Saldo & Rekening",
          desc: "Atur nomor rekening tujuan transfer dan riwayat insentif tim marketing.",
        },
        {
          title: "Asisten AI Marketing",
          desc: "Konsultasi materi promosi, ide copywriting penawaran, dan edukasi fitur Cleanique.",
        },
      ],
    };
  }

  if (role === "tenant_owner") {
    return {
      badge: "Tour Manajemen Outlet",
      modalTitle: "Mulai Tour Manajemen Outlet?",
      greetingText: (userName, outletName) => (
        <span>
          Halo <strong className="text-slate-900">{userName}</strong>, selamat bergabung di{" "}
          <strong className="text-slate-900">{outletName}</strong>! Ikuti tour singkat (±1 menit) untuk
          menguasai alur operasional kasir dan keuangan outlet Anda.
        </span>
      ),
      highlights: [
        {
          title: "Monitoring Shift & Kasir",
          desc: "Pantau kasir bertugas, modal kas awal laci, dan rekonsiliasi kas saat pergantian shift.",
        },
        {
          title: "Operasional Kasir & Order",
          desc: "Pusat antrian cucian kiloan/satuan, timbang pakaian, dan nota digital WhatsApp otomatis.",
        },
        {
          title: "Laporan & Buku Kas",
          desc: "Pantau omzet harian, catat pengeluaran toko, dan analisa laporan laba-rugi terpadu.",
        },
        {
          title: "AI Business Copilot",
          desc: "Analisis performa bisnis, audit efisiensi bahan, dan konsultasi strategi omzet 24/7.",
        },
      ],
    };
  }

  if (role === "superadmin") {
    return {
      badge: "Tour Pusat Kendali",
      modalTitle: "Mulai Tour Pusat Kendali?",
      greetingText: (userName) => (
        <span>
          Halo <strong className="text-slate-900">{userName}</strong>, selamat datang di{" "}
          <strong className="text-slate-900">Pusat Kendali Cleanique</strong>! Ikuti tour singkat untuk
          memahami navigasi master data dan manajemen multi-tenant.
        </span>
      ),
      highlights: [
        {
          title: "Kelola Outlet & Akun",
          desc: "Pantau seluruh tenant cabang laundry yang aktif, status langganan, dan aktivasi akun.",
        },
        {
          title: "Billing & Paket Langganan",
          desc: "Kelola master paket langganan, invoice perpanjangan, dan verifikasi bukti pembayaran.",
        },
        {
          title: "Program Referral Platform",
          desc: "Manajemen kode referral, verifikasi insentif marketing, dan kupon promo.",
        },
        {
          title: "Cleanique AI Copilot",
          desc: "Bantuan diagnosis sistem, navigasi cepat platform, dan audit data multi-cabang.",
        },
      ],
    };
  }

  // Default: Staff / Kasir
  return {
    badge: "Tour Meja Kasir",
    modalTitle: "Mulai Tour Meja Kasir?",
    greetingText: (userName, outletName) => (
      <span>
        Halo <strong className="text-slate-900">{userName}</strong>, selamat bertugas di{" "}
        <strong className="text-slate-900">{outletName}</strong>! Ikuti tour singkat (±1 menit) untuk
        menguasai alur kerja meja kasir dan operasional harian.
      </span>
    ),
    highlights: [
      {
        title: "Meja Kasir POS",
        desc: "Entri order kiloan/satuan, timbang pakaian, dan proses transaksi pesanan dengan cepat.",
      },
      {
        title: "Buka / Tutup Shift",
        desc: "Input modal kas awal laci dan rekonsiliasi kas fisik saat pergantian shift kasir.",
      },
      {
        title: "WhatsApp Gateway",
        desc: "Nota digital dan informasi cucian selesai otomatis dikirim ke nomor WhatsApp pelanggan.",
      },
      {
        title: "AI Kasir Helper",
        desc: "Panduan instan penanganan noda pakaian, jenis bahan, dan bantuan operasional kasir.",
      },
    ],
  };
};

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartSpotlightTour,
  currentUserRole = "staff",
  userName = "Marketing",
  outletName = "Cleanique Laundry",
}) => {
  if (!isOpen) return null;

  const roleConfig = getRoleConfig(currentUserRole);

  const handleStartTour = () => {
    onClose();
    if (onStartSpotlightTour) {
      onStartSpotlightTour();
    }
  };

  const handleSkipTour = () => {
    onComplete();
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleSkipTour} maxWidth="max-w-md">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden text-slate-900">
        {/* Top Header Accent Banner */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 w-full" />
        <div className="p-5 sm:p-6 bg-white relative border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              {roleConfig.badge}
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {roleConfig.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSkipTour}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 ml-2"
            title="Lewati Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {roleConfig.greetingText(userName, outletName)}
          </p>

          {/* Feature Highlights Grid */}
          <div className="space-y-2 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80">
            {roleConfig.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="text-emerald-600 font-bold text-xs leading-none shrink-0 mt-0.5">
                  ✓
                </span>
                <p className="leading-snug">
                  <strong className="text-slate-900">{item.title}:</strong>{" "}
                  <span className="text-slate-600">{item.desc}</span>
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Tour akan memandu langsung dengan penyorot (spotlight) di layar Anda.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15 transition cursor-pointer"
            >
              <span>Ya, Mulai Tour Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSkipTour}
              className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Lewati, Saya Sudah Paham
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};

