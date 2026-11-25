export interface GatewayTransaction {
  order_id: string; transaction_id: string; transaction_status: string;
  gross_amount: string; status_code: string; fraud_status?: string; currency?: string;
}
export interface PaymentGateway {
  create(orderId: string, amount: number, expiresAt?: string): Promise<{ token: string; redirect_url: string }>;
  status(orderId: string): Promise<GatewayTransaction | null>;
}
export class GatewayRejectedError extends Error {}
export function resolveMidtransSettings(env: Record<string, string | undefined> = process.env) {
  const serverKey = (env.MIDTRANS_SERVER_KEY || "").trim();
  const production = env.MIDTRANS_IS_PRODUCTION === "true";
  const explicitlyDisabled = env.MIDTRANS_ENABLED === "false";
  if (explicitlyDisabled || !serverKey) {
    return { enabled: false, production, serverKey: "" };
  }
  if (production && serverKey.startsWith("SB-")) {
    throw new Error("Konfigurasi Server Key Midtrans tidak sesuai environment");
  }
  return { enabled: true, production, serverKey };
}

export const midtransSettings = resolveMidtransSettings();

export class MidtransClient implements PaymentGateway {
  constructor(private readonly key: string, private readonly production: boolean) {}
  private async request(url: string, body?: unknown): Promise<Response> {
    return fetch(url, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Basic ${Buffer.from(this.key + ":").toString("base64")}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
  }
  async create(orderId: string, amount: number, expiresAt?: string) {
    const minutes = expiresAt ? Math.floor((Date.parse(expiresAt) - Date.now()) / 60000) : 1440;
    if (!Number.isFinite(minutes) || minutes < 1) throw new GatewayRejectedError("Invoice kedaluwarsa");
    const origin = this.production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const response = await this.request(`${origin}/snap/v1/transactions`, {
      transaction_details: { order_id: orderId, gross_amount: amount },
      expiry: { start_time: new Date().toISOString().slice(0,19).replace("T", " ") + " +0000", unit: "minutes", duration: Math.min(1440, minutes) },
    });
    if ([400, 401, 403, 422].includes(response.status)) throw new GatewayRejectedError("Midtrans menolak permintaan checkout");
    if (!response.ok) throw new Error("Midtrans tidak dapat membuat checkout");
    const value = await response.json() as { token?: string; redirect_url?: string };
    if (!value.token || !value.redirect_url || new URL(value.redirect_url).origin !== origin) throw new Error("Respons checkout Midtrans tidak valid");
    return { token: value.token, redirect_url: value.redirect_url };
  }
  async status(orderId: string) {
    const origin = this.production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
    const response = await this.request(`${origin}/v2/${encodeURIComponent(orderId)}/status`);
    if (response.status === 404) return null; // A Snap token may not yet have a Core transaction.
    if (!response.ok) throw new Error("Status Midtrans tidak tersedia");
    return await response.json() as GatewayTransaction;
  }
}
export const midtransClient = new MidtransClient(midtransSettings.serverKey, midtransSettings.production);
