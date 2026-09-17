import React from "react";
import { Tenant, Order } from "../../../types";
import { ReportMetrics, ServiceBreakdownItem } from "./useReportData";

interface OfficialReportDocumentProps {
  activeTenant: Tenant;
  dateRangeLabel: string;
  metrics: ReportMetrics;
  serviceBreakdown: ServiceBreakdownItem[];
  filteredOrders: Order[];
  tenants?: Tenant[];
}

export const OfficialReportDocument: React.FC<OfficialReportDocumentProps> = ({
  activeTenant,
  dateRangeLabel,
  metrics,
  serviceBreakdown,
  filteredOrders,
  tenants = [],
}) => {
  const isMultiTenant = activeTenant.id === "all";

  return (
    <div className="bg-white font-sans text-zinc-900 leading-normal p-3 sm:p-4">
      {/* Kop Surat Resmi dengan Garis Ganda Standar Akuntansi */}
      <div className="border-b-4 border-double border-zinc-900 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xl tracking-tighter shrink-0 print:border print:border-zinc-900">
              OB
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                  {activeTenant.outletName}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-200">
                  {activeTenant.id === "all" ? "JARINGAN PUSAT" : `ID: ${activeTenant.id}`}
                </span>
              </div>
              <p className="text-xs text-zinc-700 mt-1">{activeTenant.address}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-600 mt-0.5 font-mono">
                <span>Telepon: {activeTenant.phone}</span>
                <span>•</span>
                <span>
                  Pemilik / PJ:{" "}
                  <strong className="text-zinc-900 font-sans">
                    {activeTenant.owner?.name || "Budi Santoso"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block bg-blue-900 text-white font-bold text-[11px] px-3 py-1 rounded tracking-wide">
              ORCHID BRAND
            </span>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Smart Laundry Management</p>
            <p className="text-[9px] text-zinc-400 font-mono">Dokumen Resmi Sistem</p>
          </div>
        </div>
      </div>

      {/* Judul Dokumen & Metadata Periode */}
      <div className="text-center mb-6">
        <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
          {isMultiTenant
            ? "LAPORAN KEUANGAN KONSOLIDASI SELURUH CABANG"
            : `LAPORAN KEUANGAN & OPERASIONAL ${activeTenant.outletName.toUpperCase()}`}
        </h2>
        <p className="text-xs text-zinc-600 mt-1">
          Periode Pemeriksaan: <strong className="text-zinc-900 font-bold">{dateRangeLabel}</strong>
          {" "}| Dicetak pada:{" "}
          <strong className="text-zinc-900">
            {new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </strong>
        </p>
      </div>

      {/* 1. Rekapitulasi Laba Rugi Eksekutif */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-3 border-blue-900 pl-2">
          1. Rekapitulasi Laba Rugi & Indikator Finansial
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <tbody className="divide-y divide-zinc-200">
            <tr className="bg-zinc-50 font-semibold">
              <td className="p-2.5 text-zinc-800">Total Pemasukan Bruto (Omset Transaksi Lunas)</td>
              <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                Rp {metrics.totalRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-700">Piutang Pelanggan (Pesanan Belum Dilunasi)</td>
              <td className="p-2 text-right font-mono text-amber-800 font-medium">
                Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-700">Total Beban Pengeluaran Operasional</td>
              <td className="p-2 text-right font-mono text-rose-800 font-medium">
                (Rp {metrics.totalExpense.toLocaleString("id-ID")})
              </td>
            </tr>
            <tr className="bg-blue-50/60 font-bold border-t-2 border-zinc-900 text-zinc-900">
              <td className="p-2.5 text-sm">LABA BERSIH OPERASIONAL (NET PROFIT)</td>
              <td className="p-2.5 text-right font-mono text-sm">
                Rp {metrics.netProfit.toLocaleString("id-ID")}
                <span className="text-xs font-sans text-blue-900 ml-1.5 font-bold">
                  (Margin: {metrics.profitMargin}%)
                </span>
              </td>
            </tr>
            <tr className="bg-zinc-50/50 text-[11px] text-zinc-600">
              <td className="p-2">Ringkasan Volume Operasional Periode Ini</td>
              <td className="p-2 text-right font-mono">
                {metrics.totalOrders} Pesanan ({metrics.totalKg.toFixed(1)} Kg + {metrics.totalPcs} Pcs)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Rincian Kontribusi Layanan */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-3 border-blue-900 pl-2">
          2. Kontribusi Penjualan per Layanan
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-800 uppercase">
            <tr>
              <th className="p-2 text-left border-b border-zinc-300">Nama Layanan</th>
              <th className="p-2 text-center border-b border-zinc-300">Jumlah Pesanan</th>
              <th className="p-2 text-center border-b border-zinc-300">Total Volume</th>
              <th className="p-2 text-right border-b border-zinc-300">Total Omset (Rp)</th>
              <th className="p-2 text-right border-b border-zinc-300">Kontribusi (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {serviceBreakdown.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-zinc-400">
                  Tidak ada data layanan pada periode ini
                </td>
              </tr>
            ) : (
              serviceBreakdown.map((s) => (
                <tr key={s.name}>
                  <td className="p-2 font-medium text-zinc-900">{s.name}</td>
                  <td className="p-2 text-center font-mono">{s.count} order</td>
                  <td className="p-2 text-center font-mono">
                    {s.qty} {s.unit}
                  </td>
                  <td className="p-2 text-right font-mono font-semibold text-zinc-900">
                    Rp {s.total.toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 text-right font-mono font-medium text-zinc-700">
                    {s.pct}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Buku Besar Transaksi Rinci (Lengkap & Tervalidasi) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-l-3 border-blue-900 pl-2">
            3. Buku Besar Transaksi ({filteredOrders.length} Pesanan)
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">
            Urutan Kronologis Sesuai Filter
          </span>
        </div>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-800 uppercase">
            <tr>
              <th className="p-2 text-center border-b border-zinc-300 w-8">No</th>
              <th className="p-2 text-left border-b border-zinc-300">No Nota</th>
              <th className="p-2 text-left border-b border-zinc-300">Tanggal</th>
              {isMultiTenant && (
                <th className="p-2 text-left border-b border-zinc-300">Cabang</th>
              )}
              <th className="p-2 text-left border-b border-zinc-300">Pelanggan</th>
              <th className="p-2 text-left border-b border-zinc-300">Layanan & Qty</th>
              <th className="p-2 text-center border-b border-zinc-300">Status</th>
              <th className="p-2 text-center border-b border-zinc-300">Pembayaran</th>
              <th className="p-2 text-right border-b border-zinc-300">Total (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={isMultiTenant ? 9 : 8} className="p-6 text-center text-zinc-400">
                  Tidak ada catatan transaksi pada filter yang dipilih
                </td>
              </tr>
            ) : (
              filteredOrders.map((o, idx) => {
                const tenantName =
                  tenants.find((t) => t.id === o.tenantId)?.outletName ||
                  o.tenantId ||
                  activeTenant.outletName;
                const statusLabel =
                  o.status === "completed"
                    ? "Selesai"
                    : o.status === "ready"
                    ? "Siap Diambil"
                    : o.status === "cancelled"
                    ? "Dibatalkan"
                    : "Diproses";
                const isPaid = o.paymentStatus === "paid";

                return (
                  <tr key={o.id} className="hover:bg-zinc-50/50">
                    <td className="p-2 text-center font-mono text-zinc-500">{idx + 1}</td>
                    <td className="p-2 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                      {o.invoiceNo}
                    </td>
                    <td className="p-2 text-zinc-600 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    {isMultiTenant && (
                      <td className="p-2 font-medium text-zinc-800 whitespace-nowrap">
                        {tenantName}
                      </td>
                    )}
                    <td className="p-2 text-zinc-900">
                      <span className="font-medium">{o.customer?.name || "Pelanggan Langsung"}</span>
                      {o.customer?.phone && (
                        <span className="block text-[10px] text-zinc-400 font-mono">
                          {o.customer.phone}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-zinc-700">
                      <span>{o.serviceType}</span>{" "}
                      <span className="text-zinc-500 font-mono text-[11px]">
                        ({o.weightOrQty} {o.unit})
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border border-zinc-200 bg-zinc-50 text-zinc-800">
                        {statusLabel}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {isPaid ? "Lunas" : "Belum Lunas"}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap">
                      Rp {o.totalAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredOrders.length > 0 && (
            <tfoot className="bg-zinc-100 border-t-2 border-zinc-900 font-bold text-zinc-900">
              <tr>
                <td colSpan={isMultiTenant ? 8 : 7} className="p-2.5 text-right uppercase tracking-wider text-xs">
                  TOTAL KESELURUHAN ({filteredOrders.length} Pesanan):
                </td>
                <td className="p-2.5 text-right font-mono text-sm">
                  Rp {filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 4. Kolom Tanda Tangan & Pengesahan Resmi */}
      <div className="grid grid-cols-2 gap-8 text-center text-xs pt-6 border-t border-zinc-300 mt-8 print:mt-12">
        <div>
          <p className="text-zinc-500 mb-14">Dibuat & Diverifikasi oleh (Staf/Kasir):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-400 pt-1.5 mx-8">
            ( ........................................ )
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Staf Administrasi & Kasir</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-14">Disetujui & Disahkan oleh (Pemilik Cabang):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-400 pt-1.5 mx-8 uppercase">
            ( {activeTenant.owner?.name || activeTenant.outletName} )
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
            {isMultiTenant ? "Super Admin Pusat" : `Pemilik ${activeTenant.outletName}`}
          </p>
        </div>
      </div>
    </div>
  );
};
