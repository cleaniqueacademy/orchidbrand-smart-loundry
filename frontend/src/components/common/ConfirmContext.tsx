import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AlertTriangle, Trash2, LogOut, CheckCircle2, HelpCircle, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconContainerClass: string;
    confirmButtonClass: string;
  }
> = {
  danger: {
    icon: Trash2,
    iconContainerClass: "bg-rose-50 text-rose-600 border-rose-200",
    confirmButtonClass:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    iconContainerClass: "bg-amber-50 text-amber-600 border-amber-200",
    confirmButtonClass:
      "bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:ring-amber-500",
  },
  info: {
    icon: HelpCircle,
    iconContainerClass: "bg-blue-50 text-blue-900 border-blue-200",
    confirmButtonClass:
      "bg-blue-900 hover:bg-blue-800 text-white shadow-sm focus:ring-blue-900",
  },
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "Konfirmasi Tindakan",
    description: "Apakah Anda yakin ingin melanjutkan?",
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  // Keyboard shortcut: ESC to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const variant = options.variant || "danger";
  const cfg = variantConfig[variant];
  const IconComponent = options.icon || cfg.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Confirmation Modal Backdrop & Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 no-print"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl p-6 sm:p-7 shadow-2xl border border-zinc-200 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close Cross */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
              aria-label="Batal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.iconContainerClass}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0 pr-4">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug">
                  {options.title}
                </h3>
                <div className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                  {options.description}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 transition shadow-2xs"
              >
                {options.cancelText || "Batal"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${cfg.confirmButtonClass}`}
              >
                {options.confirmText || "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
};
