import React from "react";
import { Sparkles, ArrowRight, HelpCircle, Plus } from "lucide-react";

export interface EmptyStateWalkthroughProps {
  icon?: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tips?: string[];
}

export const EmptyStateWalkthrough: React.FC<EmptyStateWalkthroughProps> = ({
  icon,
  badge = "Panduan Memulai",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips,
}) => {
  return (
    <div className="py-10 px-4 sm:px-8 max-w-lg mx-auto flex flex-col items-center text-center">
      {/* Icon with glowing ambient badge */}
      <div className="relative mb-3.5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10">
          {icon || <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />}
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
      </div>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold mb-2">
        <Sparkles className="w-3 h-3 text-emerald-600" />
        {badge}
      </span>

      {/* Title & Description */}
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mb-4">
        {description}
      </p>

      {/* Optional Quick Tips */}
      {tips && tips.length > 0 && (
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4 text-left space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Tips Cepat:
          </span>
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-normal">
              <span className="text-emerald-600 font-bold">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-900/15 hover:from-emerald-700 hover:to-teal-800 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>{secondaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
