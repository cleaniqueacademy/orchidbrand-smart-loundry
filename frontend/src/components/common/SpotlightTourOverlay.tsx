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
        // Smoothly scroll target into view if needed
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
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

    // Initial update + micro delays for tab & layout stabilization
    updateRect();
    const timeout = setTimeout(updateRect, 100);
    const timeout2 = setTimeout(updateRect, 300);

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
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

  // Calculate Popover Position & Directional Arrow Notch
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 768;
  const popoverWidth = Math.min(390, windowWidth - 32);

  let popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9995,
    width: `${popoverWidth}px`,
  };

  let arrowPlacement: "top" | "bottom" | "left" | "right" = "top";
  let arrowStyle: React.CSSProperties = {};

  if (targetRect) {
    const targetCenterX = targetRect.x + targetRect.width / 2;
    const targetCenterY = targetRect.y + targetRect.height / 2;

    const spaceAbove = targetRect.y;
    const spaceBelow = windowHeight - (targetRect.y + targetRect.height);
    const spaceRight = windowWidth - (targetRect.x + targetRect.width);

    const preferred = step.preferredPlacement;

    if (preferred === "right" && spaceRight >= popoverWidth + 24) {
      // Place to the right of the target (e.g. for Sidebar menu items)
      popoverStyle.left = `${targetRect.x + targetRect.width + 18}px`;
      let topPos = targetCenterY - 80;
      topPos = Math.max(16, Math.min(topPos, windowHeight - 320));
      popoverStyle.top = `${topPos}px`;
      arrowPlacement = "left";
      arrowStyle = {
        top: `${Math.max(16, Math.min(targetCenterY - topPos, 240))}px`,
        left: "-7px",
      };
    } else if (preferred === "top" || (spaceAbove >= 260 && spaceBelow < 260)) {
      // Place above target (e.g. for bottom corner items like AI Copilot)
      popoverStyle.bottom = `${windowHeight - targetRect.y + 14}px`;
      let leftPos = targetCenterX - popoverWidth / 2;
      leftPos = Math.max(16, Math.min(leftPos, windowWidth - popoverWidth - 16));
      popoverStyle.left = `${leftPos}px`;
      arrowPlacement = "bottom";
      arrowStyle = {
        bottom: "-7px",
        left: `${Math.max(24, Math.min(targetCenterX - leftPos, popoverWidth - 24))}px`,
      };
    } else {
      // Default: Place below target (e.g. for Header buttons like Shift, WhatsApp, Panduan)
      popoverStyle.top = `${targetRect.y + targetRect.height + 14}px`;
      let leftPos = targetCenterX - popoverWidth / 2;
      leftPos = Math.max(16, Math.min(leftPos, windowWidth - popoverWidth - 16));
      popoverStyle.left = `${leftPos}px`;
      arrowPlacement = "top";
      arrowStyle = {
        top: "-7px",
        left: `${Math.max(24, Math.min(targetCenterX - leftPos, popoverWidth - 24))}px`,
      };
    }
  } else {
    // Center fallback if target element is not found on screen
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9995,
      width: `${popoverWidth}px`,
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
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#spotlight-tour-mask)"
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
          className="fixed z-[9992] pointer-events-none rounded-2xl ring-4 ring-blue-600/90 shadow-[0_0_25px_rgba(37,99,235,0.45)] transition-all duration-200"
        >
          {/* Static Beacon Dot on top-right corner of target */}
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. POPOVER / TOOLTIP TOUR CARD                                            */}
      {/* ========================================================================= */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="relative bg-white border border-zinc-200/90 text-zinc-900 rounded-2xl shadow-2xl shadow-zinc-950/25 p-5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3.5"
      >
        {/* Directional Arrow Notch pointing directly to target element */}
        {targetRect && (
          <div
            style={arrowStyle}
            className={`absolute w-3.5 h-3.5 bg-white border-zinc-200 rotate-45 pointer-events-none z-10 ${
              arrowPlacement === "top"
                ? "border-t border-l"
                : arrowPlacement === "bottom"
                ? "border-b border-r"
                : arrowPlacement === "left"
                ? "border-b border-l"
                : "border-t border-r"
            }`}
          />
        )}

        {/* Popover Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              {currentStepIndex + 1}/{steps.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Tutup Tur"
              aria-label="Tutup Tur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Popover Content */}
        <div className="space-y-1.5">
          <h3 id="tour-popover-title" className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
            {step.title}
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            {step.description}
          </p>

          {step.tips && step.tips.length > 0 && (
            <div className="pt-1.5 space-y-1 bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
              {step.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-zinc-600 leading-normal">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1 pt-0.5">
          {steps.map((s, idx) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === currentStepIndex
                  ? "w-6 bg-blue-600 shadow-2xs"
                  : idx < currentStepIndex
                  ? "w-2 bg-blue-200"
                  : "w-2 bg-zinc-200"
              }`}
            />
          ))}
        </div>

        {/* Popover Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 hover:underline transition-colors px-1 cursor-pointer"
          >
            Lewati
          </button>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              type="button"
              onClick={isLast ? onFinish : onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  <span>Selesai</span>
                </>
              ) : (
                <>
                  <span>Lanjut</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
