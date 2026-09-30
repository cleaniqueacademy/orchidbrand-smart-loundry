import React from "react";
import { Receipt, HelpCircle, Plus } from "lucide-react";

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
  badge,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips,
}) => {
  return (
    <div className="py-8 px-4 max-w-lg mx-auto flex flex-col items-center text-center">
      {/* Subtle clean neutral icon */}
      <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center border border-zinc-200/80 mb-3 shadow-2xs">
        {icon || <Receipt className="w-5 h-5 text-zinc-400" />}
      </div>

      {/* Optional Badge (only if explicitly provided) */}
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-semibold mb-2">
          {badge}
        </span>
      )}

      {/* Title & Description */}
      <h4 className="text-sm sm:text-base font-bold text-zinc-800 tracking-tight leading-snug mb-1">
        {title}
      </h4>
      <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto mb-3.5">
        {description}
      </p>

      {/* Clean Quick Tips */}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-md bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 text-left space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Tips Cepat:
          </span>
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 leading-normal">
              <span className="text-zinc-400 font-bold">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons (only if provided) */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex items-center gap-2.5 flex-wrap justify-center">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

