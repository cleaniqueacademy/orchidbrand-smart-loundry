/** qris-saurus 1.1.0 publishes JS but omits its declared .d.ts. Narrow audited SDK surface. */
declare module "qris-saurus" {
  export interface QrisNode { id: string; length: number; value: string; children?: QrisNode[] }
  export function parse(payload: string): { raw: string; nodes: QrisNode[]; crc: string };
  export function validate(payload: string): { valid: boolean; errors: string[] };
  export function computeCrc(payload: string): string;
  export function staticToDynamic(payload: string, options: { amount: number; merchantRef?: string; tipType?: "none" }): string;
  export function renderQrToDataUrl(payload: string, options?: { width?: number; margin?: number }): Promise<string>;
}
