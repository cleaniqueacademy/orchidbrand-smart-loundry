import React from "react";
import {
  Sparkles,
  Compass,
  X,
  Store,
  Clock,
  MessageCircle,
  Bot,
  ArrowRight,
} from "lucide-react";
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

export const OnboardingTutorialModal: React.FC<OnboardingTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartSpotlightTour,
  currentUserRole = "staff",
  userName = "Mitra",
  outletName = "Cleanique Laundry",
}) => {
  if (!isOpen) return null;

  const isStaff = currentUserRole === "staff";

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
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xl overflow-hidden text-zinc-900">
        {/* Top Header Accent Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={handleSkipTour}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Lewati Tour"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
              <Compass className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Tour Pengenalan
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-tight">
                Mulai Tour Aplikasi?
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Halo <strong className="text-zinc-900">{userName}</strong>, selamat bergabung di{" "}
              <strong className="text-zinc-900">{outletName}</strong>! Apakah Anda ingin mengikuti
              tour pengenalan antarmuka singkat (±1 menit) untuk menguasai alur kerja sistem?
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-2 bg-zinc-50/80 rounded-xl p-3 border border-zinc-200/70">
            <div className="flex items-center gap-2.5 text-xs text-zinc-700">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong>Meja Kasir POS:</strong> Entri order kiloan/satuan & cetak nota.
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-700">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong>Buka/Tutup Shift:</strong> Rekonsiliasi kas awal & uang fisik laci.
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-700">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong>WhatsApp Gateway:</strong> Nota & pelacakan resi otomatis pelanggan.
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-700">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span>
                <strong>{isStaff ? "AI Kasir Helper:" : "Asisten AI Bisnis:"}</strong> Bantuan cepat &
                analisa langsung di layar.
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            💡 Tour akan memandu langsung dengan lampu sorot (spotlight) di layar Anda.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/25 transition cursor-pointer"
            >
              <span>Ya, Mulai Tour Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSkipTour}
              className="w-full py-2 px-4 rounded-xl text-zinc-500 hover:text-zinc-800 text-xs font-medium transition cursor-pointer"
            >
              Lewati, Saya Sudah Paham
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
