import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { TabType } from "../../types";

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  badge: string;
  description: string;
  tips?: string[];
  actionRequiredTab?: TabType;
  preferredPlacement?: "top" | "bottom" | "left" | "right";
}

export interface SpotlightTourOverlayProps {
  isOpen: boolean;
  steps: TourStep[];
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onClose: () => void;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SpotlightTourOverlay: React.FC<SpotlightTourOverlayProps> = ({
  isOpen,
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onClose,
  activeTab,
  setActiveTab,
}) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStepIndex];
  const isLast = currentStepIndex === steps.length - 1;

  // Auto-switch tab if step requires a specific tab
  useEffect(() => {
    if (!isOpen || !step) return;
    if (step.actionRequiredTab && activeTab !== step.actionRequiredTab && setActiveTab) {
      setActiveTab(step.actionRequiredTab);
    }
  }, [isOpen, step, activeTab, setActiveTab]);

  // Measure target element position
  useEffect(() => {
    if (!isOpen || !step) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        // Hanya rekam jika elemen terlihat di layar
        if (r.width > 0 && r.height > 0) {
          setTargetRect({
            x: r.left,
            y: r.top,
            width: r.width,
            height: r.height,
          });
          return;
        }
      }
      setTargetRect(null);
    };

    // Initial update + micro delay for tab render
    updateRect();
    const timeout = setTimeout(updateRect, 150);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen, step, currentStepIndex, activeTab]);

  if (!isOpen || !step) return null;

  const padding = 8;
  const spotlightX = targetRect ? Math.max(0, targetRect.x - padding) : 0;
  const spotlightY = targetRect ? Math.max(0, targetRect.y - padding) : 0;
  const spotlightW = targetRect ? targetRect.width + padding * 2 : 0;
  const spotlightH = targetRect ? targetRect.height + padding * 2 : 0;

  // Calculate Popover Position (Clamp within viewport)
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 768;

  let popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9995,
  };

  if (targetRect) {
    const popoverWidth = Math.min(380, windowWidth - 32);
    const spaceBelow = windowHeight - (spotlightY + spotlightH);
    const spaceAbove = spotlightY;

    // Default: Below target if enough space, otherwise above
    if (spaceBelow >= 240 || spaceBelow >= spaceAbove) {
      popoverStyle.top = `${spotlightY + spotlightH + 14}px`;
    } else {
      popoverStyle.bottom = `${windowHeight - spotlightY + 14}px`;
    }

    // Horizontal alignment
    let leftPos = spotlightX + spotlightW / 2 - popoverWidth / 2;
    if (leftPos + popoverWidth > windowWidth - 16) {
      leftPos = windowWidth - popoverWidth - 16;
    }
    if (leftPos < 16) {
      leftPos = 16;
    }
    popoverStyle.left = `${leftPos}px`;
    popoverStyle.width = `${popoverWidth}px`;
  } else {
    // Center fallback if target element is not found on screen
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9995,
      maxWidth: "420px",
      width: "calc(100% - 32px)",
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-popover-title"
      className="fixed inset-0 z-[9990] overflow-hidden no-print"
    >
      {/* ========================================================================= */}
      {/* 1. SPOTLIGHT / OVERLAY BACKDROP (SVG Cutout Mask)                         */}
      {/* ========================================================================= */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-tour-mask">
            {/* White background = dim layer visible */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rectangle = transparent cutout for highlighted target */}
            {targetRect && (
              <rect
                x={spotlightX}
                y={spotlightY}
                width={spotlightW}
                height={spotlightH}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark semi-transparent backdrop applied with mask */}
        <rect
          width="100%" height="100%"
          fill="rgba(5, 17, 25, 0.78)"
          mask="url(#spotlight-tour-mask)"
          onClick={onClose}
        />
      </svg>

      {/* ========================================================================= */}
      {/* 2. GLOWING HIGHLIGHT RING & 3. PULSING BEACON AROUND TARGET               */}
      {/* ========================================================================= */}
      {targetRect && (
        <div
          style={{
            top: `${spotlightY}px`,
            left: `${spotlightX}px`,
            width: `${spotlightW}px`,
            height: `${spotlightH}px`,
          }}
          className="fixed z-[9992] pointer-events-none rounded-2xl ring-3 ring-emerald-400/90 shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all duration-200"
        >
          {/* Beacon / Pulsing Dot on top-right corner of target */}
          <span className="absolute -top-2 -right-2 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs" />
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. POPOVER / TOOLTIP TOUR CARD                                            */}
      {/* ========================================================================= */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="bg-gradient-to-b from-[#0f2432] via-[#091b26] to-[#06121b] border border-emerald-500/30 text-white rounded-2xl shadow-2xl shadow-black/80 p-4 sm:p-5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Tutup Tur"
              aria-label="Tutup Tur"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Popover Content */}
        <div className="space-y-1.5">
          <h3 id="tour-popover-title" className="text-sm sm:text-base font-extrabold text-white leading-snug">
            {step.title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {step.description}
          </p>

          {step.tips && step.tips.length > 0 && (
            <div className="pt-1.5 space-y-1">
              {step.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-normal">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1 pt-1">
          {steps.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1 rounded-full transition-all duration-200 ${
                idx === currentStepIndex
                  ? "w-6 bg-emerald-400 shadow-xs shadow-emerald-400/50"
                  : idx < currentStepIndex
                  ? "w-2 bg-emerald-600/80"
                  : "w-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Popover Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:underline transition-colors px-1"
          >
            Lewati
          </button>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              type="button"
              onClick={isLast ? onFinish : onNext}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-xs font-bold text-white shadow-md shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-600 active:scale-95 transition-all cursor-pointer"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                  <span>Selesai</span>
                </>
              ) : (
                <>
                  <span>Lanjut</span>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
