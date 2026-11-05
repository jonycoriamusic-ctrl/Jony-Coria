import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { FirebaseConfig } from './config.js';
export function firebaseAdmin(config: FirebaseConfig) {
  const name = `musica-${config.projectId}`;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (config.appEnv === 'prod' && (process.env.DEPLOY_TARGET === 'netlify' || process.env.NETLIFY === 'true') && !serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required on Netlify in production.');
  }
  const credential = serviceAccountJson ? (() => {
    const account = JSON.parse(serviceAccountJson);
    if (account.project_id !== config.projectId || account.type !== 'service_account') {
      throw new Error('Firebase service account does not match the configured project.');
    }
    return cert(account);
  })() : applicationDefault();
  const app = getApps().find(a=>a.name===name) || initializeApp({projectId:config.projectId,storageBucket:config.storageBucket,...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential})},name);
  return { auth:getAuth(app), db:getFirestore(app), bucket:config.storageBucket?getStorage(app).bucket(config.storageBucket):undefined };
}
