import type { SessionResponse } from "@musica/contracts";
import { isDemo, storedDemoToken, saveDemoToken, clearDemoToken, firebaseToken, signOutMusician, type Role } from "./auth";
export type { Role } from "./auth";
export class ApiFailure extends Error {
  constructor(public code: string, message: string) { super(message); }
}
let guestSession: Promise<string> | undefined;
export const storedToken = storedDemoToken;
export const saveToken = saveDemoToken;
export const signOut = signOutMusician;
async function demoGuestToken() {
  const saved = storedDemoToken("guest");
  if (saved) return saved;
  if (!guestSession) guestSession = fetch("/api/v1/demo/guest", {method: "POST"}).then(async (response) => {
    if (!response.ok) throw new ApiFailure("NETWORK_ERROR", "Could not start guest session");
    const session: SessionResponse = await response.json();
    saveDemoToken("guest", session.token); return session.token;
  }).finally(() => {guestSession = undefined;});
  return guestSession;
}
export async function accessToken(role: Role, forceRefresh = false): Promise<string> {
  if (!isDemo) return firebaseToken(role, forceRefresh);
  const token = role === "guest" ? await demoGuestToken() : storedDemoToken(role);
  if (!token) throw new ApiFailure("UNAUTHORIZED", "Sign in to continue");
  return token;
}
export async function ensureGuestSession() {await accessToken("guest");}

export async function api<T>(path: string, options: RequestInit & {role?: Role} = {}): Promise<T> {
  if (!isDemo && path.startsWith("/demo/")) throw new ApiFailure("DEMO_DISABLED", "Demo authentication is disabled");
  const {role, ...init} = options;
  const headers = new Headers(init.headers);
  if (role) headers.set("Authorization", `Bearer ${await accessToken(role)}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {...init, headers});
    // Retry once only for an expired Firebase token. SDK refreshes ordinary tokens automatically.
    if (response.status === 401 && role && !isDemo) {
      headers.set("Authorization", `Bearer ${await accessToken(role, true)}`);
      response = await fetch(`/api/v1${path}`, {...init, headers});
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) throw error;
    throw new ApiFailure("NETWORK_ERROR", "Connection lost. Try again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && role && isDemo) clearDemoToken(role);
    throw new ApiFailure(body.error?.code || "REQUEST_FAILED", body.error?.message || "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function privateImage(url: string, role: Role): Promise<string> {
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith("/api/v1/")) throw new ApiFailure("INVALID_IMAGE_URL", "Invalid private image URL");
  const fetchImage = async (forceRefresh = false) => fetch(parsed.href, {headers: {Authorization: `Bearer ${await accessToken(role, forceRefresh)}`}});
  let result = await fetchImage();
  if (result.status === 401 && !isDemo) result = await fetchImage(true);
  if (!result.ok) throw new ApiFailure("IMAGE_UNAVAILABLE", "Unable to load image");
  return URL.createObjectURL(await result.blob());
}
export const json = (value: unknown) => JSON.stringify(value);
