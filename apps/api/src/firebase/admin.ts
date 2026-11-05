import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { FirebaseConfig } from './config.js';
export function firebaseAdmin(config: FirebaseConfig) {
  const name = `musica-${config.projectId}`;
  const app = getApps().find(a=>a.name===name) || initializeApp({projectId:config.projectId,storageBucket:config.storageBucket,...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential:applicationDefault()})},name);
  return { auth:getAuth(app), db:getFirestore(app), bucket:config.storageBucket?getStorage(app).bucket(config.storageBucket):undefined };
}
