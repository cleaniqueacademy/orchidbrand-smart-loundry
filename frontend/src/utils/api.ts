/**
 * Utility untuk komunikasi API dan autentikasi token Bearer
 */

/** Legacy credentials are removed during the server-session cutover. */
export function getAuthToken(): null { return null; }
export function setAuthToken(_token: string): void { localStorage.removeItem("cleanique_token"); }
export function removeAuthToken(): void { localStorage.removeItem("cleanique_token"); }
export function authHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const csrf = document.cookie.match(/(?:^|;\s*)(?:__Host-)?cleanique_csrf=([^;]+)/)?.[1];
  return { "Content-Type": "application/json",
    ...(csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {}),
    ...(localStorage.getItem("cleanique_active_branch") ? { "X-Tenant-Id": localStorage.getItem("cleanique_active_branch")! } : {}),
    ...extraHeaders,
  };
}

/** Proxies can return empty/HTML errors; never expose their body or JSON parser details. */
async function readApiResponse<T>(res: Response): Promise<T> {
  try {
    return JSON.parse(await res.text()) as T;
  } catch {
    if (res.status >= 500) {
      throw new Error(`Layanan server tidak tersedia (HTTP ${res.status}). Silakan coba lagi.`);
    }
    if (res.status === 401) throw new Error("Sesi berakhir. Silakan masuk kembali.");
    if (res.status === 403) throw new Error("Anda tidak memiliki akses ke data ini.");
    if (res.status === 429) throw new Error("Terlalu banyak permintaan. Silakan coba lagi nanti.");
    throw new Error(`Respons server tidak valid (HTTP ${res.status}). Silakan coba lagi.`);
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const headers = {
      ...authHeaders(),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await readApiResponse<{ success: boolean; data?: T; message?: string }>(res);
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal menghubungi server",
    };
  }
}

export const api = {
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      method: "GET",
      headers: {
        ...authHeaders(),
        ...(options.headers as Record<string, string>),
      },
    });
    return readApiResponse<T>(res);
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {
      ...authHeaders(),
      ...(options.headers as Record<string, string>),
    };
    if (isFormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(endpoint, {
      ...options,
      method: "POST",
      headers,
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    return readApiResponse<T>(res);
  },

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {
      ...authHeaders(),
      ...(options.headers as Record<string, string>),
    };
    if (isFormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(endpoint, {
      ...options,
      method: "PUT",
      headers,
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    return readApiResponse<T>(res);
  },

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      method: "DELETE",
      headers: {
        ...authHeaders(),
        ...(options.headers as Record<string, string>),
      },
    });
    return readApiResponse<T>(res);
  },
};

export interface UploadResponse {
  success: boolean;
  message?: string;
  data?: {
    url: string;
    filename: string;
    category: string;
    size: number;
    mimeType: string;
  };
}

/**
 * Helper untuk mengunggah file ke backend Local Storage (/api/upload)
 */
export async function uploadFile(
  file: File,
  category: "payments" | "qris" | "logos" | "general" = "general"
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  return api.post<UploadResponse>("/api/upload", formData);
}

