import assert from 'node:assert/strict';
import test from 'node:test';
import { firebaseAdmin } from './admin.js';
import type { FirebaseConfig } from './config.js';

const config: FirebaseConfig = {
  appEnv:'prod', projectId:'jony-coria', mediaProvider:'cloudinary',
  allowedOrigins:[], region:'us-central1',
};

test('Netlify production requires a matching server-only Firebase service account', () => {
  const previousNetlify=process.env.NETLIFY;
  const previousAccount=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    process.env.NETLIFY='true';
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    assert.throws(()=>firebaseAdmin(config),/FIREBASE_SERVICE_ACCOUNT_JSON is required/);
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({type:'service_account',project_id:'wrong-project'});
    assert.throws(()=>firebaseAdmin(config),/does not match/);
  } finally {
    if(previousNetlify===undefined)delete process.env.NETLIFY;else process.env.NETLIFY=previousNetlify;
    if(previousAccount===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;else process.env.FIREBASE_SERVICE_ACCOUNT_JSON=previousAccount;
  }
});
