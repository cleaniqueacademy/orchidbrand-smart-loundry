import React from "react";
import { Printer, X } from "lucide-react";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between no-print bg-zinc-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-zinc-800" />
            <span className="font-bold text-zinc-900 text-sm">
              Pratinjau Lembar Cetak Laporan Resmi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF Sekarang</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body for Preview */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white font-sans">
          {children}
        </div>
      </div>
    </div>
  );
};
