import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global dispatcher for convenient use outside hook if needed
let globalToastDispatcher: ToastContextType | null = null;

export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    globalToastDispatcher?.success(title, description, duration),
  error: (title: string, description?: string, duration?: number) =>
    globalToastDispatcher?.error(title, description, duration),
  warning: (title: string, description?: string, duration?: number) =>
    globalToastDispatcher?.warning(title, description, duration),
  info: (title: string, description?: string, duration?: number) =>
    globalToastDispatcher?.info(title, description, duration),
};

const toastConfig: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    containerClass: string;
    iconClass: string;
    titleClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    containerClass: "bg-white border-emerald-200 shadow-emerald-900/10 text-zinc-900",
    iconClass: "text-emerald-600 bg-emerald-50 border border-emerald-200",
    titleClass: "text-zinc-900",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-white border-rose-200 shadow-rose-900/10 text-zinc-900",
    iconClass: "text-rose-600 bg-rose-50 border border-rose-200",
    titleClass: "text-zinc-900",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-white border-amber-200 shadow-amber-900/10 text-zinc-900",
    iconClass: "text-amber-600 bg-amber-50 border border-amber-200",
    titleClass: "text-zinc-900",
  },
  info: {
    icon: Info,
    containerClass: "bg-white border-blue-200 shadow-blue-900/10 text-zinc-900",
    iconClass: "text-blue-600 bg-blue-50 border border-blue-200",
    titleClass: "text-zinc-900",
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Limit to max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: "success", title, description, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: "error", title, description, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: "warning", title, description, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: "info", title, description, duration });
    },
    [addToast]
  );

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  // Sync to global helper
  globalToastDispatcher = contextValue;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="assertive"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
      >
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          const Icon = cfg.icon;

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-xl transition-all duration-200 transform translate-y-0 opacity-100 flex items-start gap-3 backdrop-blur-md relative overflow-hidden ${cfg.containerClass}`}
            >
              {/* Icon */}
              <div className={`p-1.5 rounded-lg shrink-0 ${cfg.iconClass}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-4">
                <p className={`text-xs font-bold leading-snug tracking-tight ${cfg.titleClass}`}>
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed break-words">
                    {t.description}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-100 transition absolute top-2.5 right-2.5"
                title="Tutup Notifikasi"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
