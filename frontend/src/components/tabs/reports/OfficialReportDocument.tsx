import React from "react";
import { Tenant, Order } from "../../../types";
import { ReportMetrics, ServiceBreakdownItem } from "./useReportData";

interface OfficialReportDocumentProps {
  activeTenant: Tenant;
  dateRangeLabel: string;
  metrics: ReportMetrics;
  serviceBreakdown: ServiceBreakdownItem[];
  filteredOrders: Order[];
}

export const OfficialReportDocument: React.FC<OfficialReportDocumentProps> = ({
  activeTenant,
  dateRangeLabel,
  metrics,
  serviceBreakdown,
  filteredOrders,
}) => {
  return (
    <div className="bg-white font-sans text-zinc-900 leading-normal p-2">
      {/* Kop Surat Resmi */}
      <div className="border-b-2 border-zinc-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
              {activeTenant.outletName}
            </h1>
            <p className="text-xs text-zinc-600 mt-1">{activeTenant.address}</p>
            <p className="text-xs text-zinc-600 font-mono">Telepon: {activeTenant.phone}</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-blue-900 text-white font-bold text-[11px] px-2.5 py-1 rounded">
              ORCHID BRAND
            </span>
            <p className="text-[10px] text-zinc-400 mt-1 font-mono">Smart Laundry System</p>
          </div>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="text-center mb-6">
        <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
          LAPORAN KEUANGAN & OPERASIONAL
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Periode: <strong className="text-zinc-800">{dateRangeLabel}</strong> | Dicetak pada:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Ringkasan Arus Kas Laba Rugi Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          1. Rekapitulasi Laba Rugi
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <tbody className="divide-y divide-zinc-200">
            <tr className="bg-zinc-50 font-semibold">
              <td className="p-2 text-zinc-700">Pemasukan Bruto (Omset Lunas)</td>
              <td className="p-2 text-right font-mono text-emerald-700">
                Rp {metrics.totalRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-600">Piutang Pelanggan (Belum Lunas)</td>
              <td className="p-2 text-right font-mono text-amber-700">
                Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-600">Total Beban Operasional</td>
              <td className="p-2 text-right font-mono text-rose-700">
                (Rp {metrics.totalExpense.toLocaleString("id-ID")})
              </td>
            </tr>
            <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-900">
              <td className="p-2.5 text-zinc-900 text-sm">LABA BERSIH (NET PROFIT)</td>
              <td className="p-2.5 text-right font-mono text-sm text-zinc-900">
                Rp {metrics.netProfit.toLocaleString("id-ID")} ({metrics.profitMargin}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Breakdown Layanan Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          2. Kontribusi Layanan
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase">
            <tr>
              <th className="p-2 text-left border-b">Nama Layanan</th>
              <th className="p-2 text-center border-b">Pesanan</th>
              <th className="p-2 text-center border-b">Volume</th>
              <th className="p-2 text-right border-b">Omset</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {serviceBreakdown.slice(0, 5).map((s) => (
              <tr key={s.name}>
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2 text-center">{s.count} order</td>
                <td className="p-2 text-center">
                  {s.qty} {s.unit}
                </td>
                <td className="p-2 text-right font-mono font-semibold">
                  Rp {s.total.toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Transaksi Terpilih */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          3. Buku Besar Transaksi (Sampel Ringkas)
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase">
            <tr>
              <th className="p-2 text-left border-b">No Nota</th>
              <th className="p-2 text-left border-b">Pelanggan</th>
              <th className="p-2 text-left border-b">Layanan</th>
              <th className="p-2 text-center border-b">Bayar</th>
              <th className="p-2 text-right border-b">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredOrders.slice(0, 8).map((o) => (
              <tr key={o.id}>
                <td className="p-2 font-mono font-semibold">{o.invoiceNo}</td>
                <td className="p-2">{o.customer?.name || "-"}</td>
                <td className="p-2">{o.serviceType}</td>
                <td className="p-2 text-center">
                  {o.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                </td>
                <td className="p-2 text-right font-mono">
                  Rp {o.totalAmount.toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan Resmi */}
      <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-zinc-200">
        <div>
          <p className="text-zinc-500 mb-14">Dibuat & Diverifikasi oleh (Kasir/Admin):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-300 pt-1 mx-8">
            ( ........................................ )
          </p>
        </div>
        <div>
          <p className="text-zinc-500 mb-14">Disetujui oleh (Pemilik Outlet / Tenant):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-300 pt-1 mx-8">
            ( {activeTenant.outletName} )
          </p>
        </div>
      </div>
    </div>
  );
};
