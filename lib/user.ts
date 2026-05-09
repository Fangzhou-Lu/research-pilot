// User identity helpers. Anonymous: each browser mints a uuid into
// localStorage and echoes it on every API call via the X-User-Id header.

export const BACKEND_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "http://127.0.0.1:8000";

const KEY = "rp:uid";
const HEADER = "x-user-id";

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let uid = window.localStorage.getItem(KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    window.localStorage.setItem(KEY, uid);
  }
  return uid;
}

/** Build a backend URL from a `/api/v1/...` path. */
export function api(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Authed fetch (client-only): sends X-User-Id and JSON content-type. */
export function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const uid = getUserId();
  const headers = new Headers(init?.headers);
  headers.set(HEADER, uid);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(api(path), { ...init, headers });
}
