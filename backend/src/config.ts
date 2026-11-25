/** Production must fail closed rather than boot with public fallback credentials. */
const production = process.env.NODE_ENV === "production";
const suppliedSecret = process.env.JWT_SECRET;
if (production && (!suppliedSecret || suppliedSecret.length < 32 || /cleanique.*secret|jwt_key_2026/i.test(suppliedSecret))) {
  throw new Error("JWT_SECRET production wajib acak, minimal 32 karakter, tanpa nilai default");
}
const origin = process.env.APP_ORIGIN;
if (production && (!origin || new URL(origin).protocol !== "https:" || new URL(origin).origin !== origin)) {
  throw new Error("APP_ORIGIN production harus berupa origin HTTPS yang valid");
}
export const config = {
  production,
  jwtSecret: suppliedSecret || crypto.randomUUID() + crypto.randomUUID(),
  origin: origin || "*",
};
