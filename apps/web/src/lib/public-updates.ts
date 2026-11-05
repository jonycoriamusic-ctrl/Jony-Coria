"use client";

import { getFirestore, connectFirestoreEmulator, doc, onSnapshot } from "firebase/firestore";
import { firebaseAuth } from "./auth";

export interface PublicUpdate {
  revision: string;
  showId?: string | null;
  capacity?: number | null;
  occupiedCount?: number | null;
  status?: "draft" | "open" | "paused" | "closed" | "finished" | null;
}

const configured = new WeakSet<ReturnType<typeof getFirestore>>();

export async function observePublicUpdates(
  slug: string,
  onUpdate: (update: PublicUpdate) => void,
  onError: () => void,
): Promise<() => void> {
  const auth = await firebaseAuth("guest");
  const db = getFirestore(auth.app);
  if (process.env.NEXT_PUBLIC_APP_ENV === "non-prod" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && !configured.has(db)) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    configured.add(db);
  }
  return onSnapshot(doc(db, "publicUpdates", slug), snapshot => {
    const value = snapshot.data() as PublicUpdate | undefined;
    if (value?.revision) onUpdate(value);
  }, onError);
}
