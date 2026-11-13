export function paymentStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    creating: "Menyiapkan checkout", pending: "Menunggu pembayaran",
    paid: "Lunas", failed: "Gagal", expired: "Kedaluwarsa",
  };
  return status ? labels[status] || "Perlu pemeriksaan" : "Belum ada transaksi";
}
