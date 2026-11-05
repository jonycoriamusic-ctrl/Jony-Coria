"use client";

import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth, browserLocalPersistence, setPersistence, onIdTokenChanged,
  signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, signOut as firebaseSignOut,
  connectAuthEmulator, type Auth, type User,
} from "firebase/auth";

export type Role = "guest" | "musician";
export const isDemo = process.env.NEXT_PUBLIC_APP_ENV === "non-prod" && process.env.NEXT_PUBLIC_AUTH_MODE === "demo";
const environment = process.env.NEXT_PUBLIC_APP_ENV;
const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
const DEMO_EVENT = "musica:demo-identity";
const demoKey = (role: Role) => `musica-demo-${role}-token`;
const demoIdentityKey = (role: Role) => `musica-demo-${role}-identity`;
const authInstances = new Map<Role, Promise<Auth>>();
let anonymousSession: Promise<User> | undefined;

export class AuthFailure extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export function configurationError(): string | null {
  if (environment !== "prod" && environment !== "non-prod") return "APP_ENV_REQUIRED";
  if (environment === "prod" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") return "PRODUCTION_EMULATOR_FORBIDDEN";
  if (isDemo) return null;
  if (authMode !== "firebase") return "FIREBASE_AUTH_REQUIRED";
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
      !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
    return "FIREBASE_CONFIG_REQUIRED";
  }
  return null;
}

export function storedDemoToken(role: Role): string | null {
  if (!isDemo || typeof window === "undefined") return null;
  try { return localStorage.getItem(demoKey(role)); } catch { return null; }
}

export function saveDemoToken(role: Role, token: string): void {
  if (!isDemo) throw new AuthFailure("DEMO_DISABLED", "Demo authentication is disabled");
  localStorage.setItem(demoKey(role), token);
  localStorage.setItem(demoIdentityKey(role), crypto.randomUUID());
  window.dispatchEvent(new Event(DEMO_EVENT));
}

export function clearDemoToken(role: Role): void {
  if (!isDemo) return;
  localStorage.removeItem(demoKey(role));
  localStorage.removeItem(demoIdentityKey(role));
  window.dispatchEvent(new Event(DEMO_EVENT));
}

export async function firebaseAuth(role: Role): Promise<Auth> {
  if (typeof window === "undefined") throw new AuthFailure("AUTH_CLIENT_ONLY", "Authentication requires a browser");
  const error = configurationError();
  if (error || isDemo) throw new AuthFailure("AUTH_CONFIGURATION", "Authentication is not configured");
  if (!authInstances.has(role)) {
    const initialization = (async () => {
      const options: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      const name = `musica-${environment}-${role}`;
      const app = getApps().find((candidate) => candidate.name === name) ?? initializeApp(options, name);
      const auth = getAuth(app);
      if (environment === "non-prod" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && !auth.emulatorConfig) {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", {disableWarnings: false});
      }
      await setPersistence(auth, browserLocalPersistence);
      await auth.authStateReady();
      return auth;
    })();
    authInstances.set(role, initialization);
    initialization.catch(() => authInstances.delete(role));
  }
  return authInstances.get(role)!;
}

export interface Identity { uid: string; email: string | null; emailVerified: boolean; }
const publicIdentity = (user: User): Identity => ({uid: user.uid, email: user.email, emailVerified: user.emailVerified});

export function observeIdentity(role: Role, listener: (identity: Identity | null) => void, onError: (error: unknown) => void): () => void {
  if (isDemo) {
    const notify = () => {
      try {
        const token = storedDemoToken(role);
        let identity = token ? localStorage.getItem(demoIdentityKey(role)) : null;
        if (token && !identity) {identity = crypto.randomUUID(); localStorage.setItem(demoIdentityKey(role), identity);}
        listener(token ? {uid: `demo:${role}:${identity}`, email: role === "musician" ? "jony@demo.local" : null, emailVerified: true} : null);
      } catch (error) {onError(error);}
    };
    notify(); window.addEventListener(DEMO_EVENT, notify); window.addEventListener("storage", notify);
    return () => {window.removeEventListener(DEMO_EVENT, notify); window.removeEventListener("storage", notify);};
  }
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  firebaseAuth(role).then((auth) => {
    if (!disposed) unsubscribe = onIdTokenChanged(auth, (user) => listener(user ? publicIdentity(user) : null), onError);
  }).catch((error) => {if (!disposed) onError(error);});
  return () => {disposed = true; unsubscribe?.();};
}

export async function ensureAnonymousUser(): Promise<User> {
  const auth = await firebaseAuth("guest");
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  if (auth.currentUser) throw new AuthFailure("INVALID_GUEST_IDENTITY", "Unexpected guest identity");
  if (!anonymousSession) anonymousSession = signInAnonymously(auth).then((credential) => credential.user).finally(() => {anonymousSession = undefined;});
  return anonymousSession;
}

export async function firebaseToken(role: Role, forceRefresh = false): Promise<string> {
  const auth = await firebaseAuth(role);
  const user = role === "guest" ? await ensureAnonymousUser() : auth.currentUser;
  if (!user || (role === "musician" && user.isAnonymous)) throw new AuthFailure("UNAUTHORIZED", "Sign in to continue");
  return user.getIdToken(forceRefresh);
}

export async function signInMusician(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(await firebaseAuth("musician"), email, password);
}

export async function registerMusician(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(await firebaseAuth("musician"), email, password);
}

export async function sendVerification(): Promise<void> {
  const auth = await firebaseAuth("musician");
  if (!auth.currentUser) throw new AuthFailure("UNAUTHORIZED", "Sign in to continue");
  await sendEmailVerification(auth.currentUser);
}

export async function refreshMusician(): Promise<void> {
  const auth = await firebaseAuth("musician");
  if (!auth.currentUser) throw new AuthFailure("UNAUTHORIZED", "Sign in to continue");
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
}

export async function resetPassword(email: string): Promise<void> {
  try {await sendPasswordResetEmail(await firebaseAuth("musician"), email);}
  catch (error) {
    // Keep the recovery response neutral when email-enumeration protection is off.
    if (!(error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found")) throw error;
  }
}

export async function signOutMusician(): Promise<void> {
  if (isDemo) clearDemoToken("musician");
  else await firebaseSignOut(await firebaseAuth("musician"));
}
