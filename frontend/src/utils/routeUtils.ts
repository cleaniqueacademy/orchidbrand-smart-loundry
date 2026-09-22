/**
 * Utility navigasi rute halaman publik (Register, Register Success, Login)
 * Menggunakan window.location tanpa perlu routing framework tambahan.
 */

export type PublicRoute = "login" | "register" | "register-success" | null;

export function getPublicRoute(): PublicRoute {
  if (typeof window === "undefined") return null;

  const path = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // Dukungan direct pathname maupun ?page=
  if (path === "/register/success" || searchParams.get("page") === "register-success") {
    return "register-success";
  }

  if (path === "/register" || searchParams.get("page") === "register") {
    return "register";
  }

  return null;
}

export function getReferralQueryParam(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("ref") || searchParams.get("referral") || null;
}

export function navigateTo(path: string) {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
