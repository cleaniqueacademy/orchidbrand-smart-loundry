import React from "react";
import { Printer, X, FileSpreadsheet } from "lucide-react";
import { ModalWrapper } from "../../common/ModalWrapper";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownloadExcel?: () => void;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  onDownloadExcel,
  children,
}) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="bg-white rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between no-print bg-zinc-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-zinc-800" />
            <span className="font-bold text-zinc-900 text-sm">
              Pratinjau Lembar Cetak Laporan Resmi
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onDownloadExcel && (
              <button
                type="button"
                onClick={onDownloadExcel}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Download lembar kerja Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
            )}
            <button
              onClick={onPrint}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
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
    </ModalWrapper>
  );
};
