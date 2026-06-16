// Client helper for calling PIN-gated admin API routes.
// The PIN lives ONLY in sessionStorage and is sent as the x-admin-pin header.

const PIN_KEY = "nff_admin_pin";

export function getAdminPin(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PIN_KEY);
}

export function setAdminPin(pin: string): void {
  window.sessionStorage.setItem(PIN_KEY, pin);
}

export function clearAdminPin(): void {
  window.sessionStorage.removeItem(PIN_KEY);
}

export class AdminAuthError extends Error {
  constructor() {
    super("Admin PIN rejected.");
    this.name = "AdminAuthError";
  }
}

// fetch wrapper that injects the PIN header and parses JSON.
export async function adminFetch<T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const pin = getAdminPin();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (pin) headers.set("x-admin-pin", pin);

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    throw new AdminAuthError();
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
