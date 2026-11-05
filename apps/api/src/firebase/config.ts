export interface FirebaseConfig {
  appEnv: 'prod'|'non-prod'; projectId: string; storageBucket?: string; mediaProvider:'firebase'|'cloudinary'; allowedOrigins: string[]; region: string;
}
export function firebaseConfig(env: NodeJS.ProcessEnv = process.env): FirebaseConfig {
  if (env.APP_ENV !== 'prod' && env.APP_ENV !== 'non-prod') throw new Error('APP_ENV must be exactly prod or non-prod.');
  const mediaProvider=env.MEDIA_PROVIDER||'firebase';
  if(mediaProvider!=='firebase'&&mediaProvider!=='cloudinary')throw new Error('MEDIA_PROVIDER must be firebase or cloudinary.');
  const projectId = env.FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT;
  let runtimeBucket: string | undefined;
  if (env.FIREBASE_CONFIG?.startsWith('{')) {try { runtimeBucket=JSON.parse(env.FIREBASE_CONFIG).storageBucket; } catch {throw new Error('Invalid runtime FIREBASE_CONFIG.');}}
  const storageBucket = env.STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || runtimeBucket;
  if (!projectId || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId) || mediaProvider==='firebase'&&(!storageBucket || !/^[a-z0-9][a-z0-9.-]+$/.test(storageBucket))) throw new Error('FIREBASE_PROJECT_ID/GCLOUD_PROJECT and STORAGE_BUCKET are required.');
  if (env.APP_ENV === 'prod' && (env.DEMO_MODE === 'true' || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST)) throw new Error('Production cannot use demo mode or Firebase emulators.');
  if (env.APP_ENV === 'prod' && projectId.startsWith('demo-')) throw new Error('A production Firebase project is required.');
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(v=>v.trim()).filter(Boolean);
  for (const origin of allowedOrigins) { const url = new URL(origin); if (url.origin !== origin || (env.APP_ENV === 'prod' && url.protocol !== 'https:')) throw new Error('ALLOWED_ORIGINS must contain exact HTTPS origins in production.'); }
  return { appEnv:env.APP_ENV, projectId, storageBucket, mediaProvider, allowedOrigins, region:env.FUNCTIONS_REGION || 'us-central1' };
}
