/**
 * Utility untuk komunikasi API dan autentikasi token Bearer
 */

export function getAuthToken(): string | null {
  return localStorage.getItem("cleanique_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("cleanique_token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("cleanique_token");
}

export function authHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
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

    const data = await res.json();
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
    return res.json();
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
    return res.json();
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
    return res.json();
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
    return res.json();
  },
};

