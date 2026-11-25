import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const localMaintenanceFile = fileURLToPath(new URL("../../data/local-reset.lock", import.meta.url));
export function localMaintenanceActive() {
  return process.env.NODE_ENV !== "production" && fs.existsSync(localMaintenanceFile);
}
