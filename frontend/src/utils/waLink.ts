import { Order, Tenant } from "../types";

/**
 * WhatsApp Link Helper dengan format pesan dinamis sesuai status & kondisi laundry perumahan
 */
export function getWaMessageText(order: Order, tenants: Tenant[]): { phone: string; text: string } {
  if (!order.customer?.phone) return { phone: "", text: "" };
  const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
  const activeTenant = tenants.find((t) => t.id === order.tenantId);
  const outletName = activeTenant ? activeTenant.outletName : "Orchid Smart Laundry";
  const custName = order.customer?.name || "Pelanggan";
  const paymentText =
    order.paymentStatus === "paid"
      ? `✅ LUNAS (${order.paymentMethod?.toUpperCase() || "CASH"})`
      : `⚠️ BELUM LUNAS (Rp ${order.totalAmount.toLocaleString("id-ID")})`;
  const rackText = order.rackNumber ? `\n📍 *Lokasi Rak/Keranjang:* ${order.rackNumber}` : "";

  const itemsText =
    order.items && order.items.length > 0
      ? `🧺 *Rincian Layanan:*\n` +
        order.items
          .map(
            (it) =>
              `• ${it.serviceType}: ${it.weightOrQty} ${it.unit} @ Rp ${it.pricePerUnit.toLocaleString("id-ID")} = Rp ${it.subtotal.toLocaleString("id-ID")}`
          )
          .join("\n")
      : `🧺 *Layanan:* ${order.serviceType} (${order.weightOrQty} ${order.unit})`;

  const isOverdue =
    order.status === "ready" &&
    Date.now() - new Date(order.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000;

  let text = "";

  if (isOverdue) {
    // Skenario Pengingat Cucian Menginap (>3 Hari belum diambil)
    const daysCount = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000);
    text = `Halo Kak ${custName}! 👋\n\nPengingat ramah dari *${outletName}* 🧺\nCucian Anda dengan No. Nota *${order.invoiceNo}* sudah selesai dan tersimpan di toko selama ${daysCount} hari.\n\n${itemsText}\n💰 *Status Bayar:* ${paymentText}${rackText}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nMohon pakaian dapat segera diambil ya Kak agar rak tidak menumpuk. Terima kasih banyak! 🙏`;
  } else if (order.status === "ready") {
    // Skenario Cucian Siap Diambil
    text = `Halo Kak ${custName}! 👋\n\nKabar gembira, cucian Anda di *${outletName}* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* ${order.invoiceNo}\n${itemsText}\n💰 *Status Bayar:* ${paymentText}${rackText}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;
  } else if (order.status === "completed") {
    // Skenario Selesai Diambil
    text = `Halo Kak ${custName}! 👋\n\nTerima kasih telah mencuci di *${outletName}* 🧺✨\nPesanan No. Nota *${order.invoiceNo}* telah selesai diambil.\n\nSemoga pakaian selalu bersih, rapi, dan harum. Ditunggu kunjungan berikutnya ya Kak! 🙏`;
  } else if (order.status === "cancelled") {
    // Skenario Dibatalkan
    text = `Halo Kak ${custName}! 🙏\nPemberitahuan bahwa pesanan laundry *${order.invoiceNo}* di *${outletName}* telah dibatalkan.\nJika ada pertanyaan silakan hubungi kami kembali. Terima kasih.`;
  } else {
    // Skenario Nota Diterima / Sedang Diproses (Antrian, Cuci, Setrika)
    text = `Halo Kak ${custName}! 👋\n\nTerima kasih telah mencuci di *${outletName}* 🧺\nPesanan Anda telah kami terima:\n\n📄 *No. Nota:* ${order.invoiceNo}\n${itemsText}\n💰 *Total Tagihan:* Rp ${order.totalAmount.toLocaleString("id-ID")}\n💳 *Status Bayar:* ${paymentText}${rackText}\n\nKami akan infokan kembali begitu cucian selesai dan siap diambil ya Kak! 🙏`;
  }

  return { phone: cleanPhone, text };
}

export function getWaLink(order: Order, tenants: Tenant[]): string {
  const { phone, text } = getWaMessageText(order, tenants);
  if (!phone) return "#";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
