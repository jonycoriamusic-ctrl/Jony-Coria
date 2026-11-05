import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authUrl = pathToFileURL(path.join(root, 'src/lib/auth.ts')).href;
const nextUrl = pathToFileURL(path.join(root, 'next.config.ts')).href;
const defaults = {
  NEXT_PUBLIC_APP_ENV: 'prod', NEXT_PUBLIC_AUTH_MODE: 'firebase', NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'false',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-only-not-a-real-key', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-musica-config-test',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-musica-config-test.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-musica-config-test.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000', NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:test',
  API_ORIGIN: 'https://example.invalid/api',
};
function evaluate(moduleUrl, env, expression) {
  return spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `const module = await import(${JSON.stringify(moduleUrl)}); ${expression}`], {
    cwd: root, env: {...process.env, ...defaults, ...env}, encoding: 'utf8', timeout: 15000,
  });
}
test('production accepts Firebase mode and never enables demo auth', () => {
  const result = evaluate(authUrl, {}, 'const auth = module.default ?? module; if(auth.isDemo || auth.configurationError()) process.exit(1);');
  assert.equal(result.status, 0, result.stderr);
});
test('demo requires explicit non-prod and demo mode', () => {
  const result = evaluate(authUrl, {NEXT_PUBLIC_APP_ENV:'non-prod', NEXT_PUBLIC_AUTH_MODE:'demo'}, 'const auth = module.default ?? module; if(!auth.isDemo || auth.configurationError()) process.exit(1);');
  assert.equal(result.status, 0, result.stderr);
  const rejected = evaluate(authUrl, {NEXT_PUBLIC_AUTH_MODE:'demo'}, 'const auth = module.default ?? module; if(auth.isDemo || !auth.configurationError()) process.exit(1);');
  assert.equal(rejected.status, 0, rejected.stderr);
});
test('production rejects emulator mode and incomplete Firebase web config', () => {
  for(const env of [{NEXT_PUBLIC_USE_FIREBASE_EMULATORS:'true'}, {NEXT_PUBLIC_FIREBASE_PROJECT_ID:''}, {NEXT_PUBLIC_APP_ENV:''}]) {
    const result = evaluate(authUrl, env, 'const auth = module.default ?? module; if(!auth.configurationError()) process.exit(1);');
    assert.equal(result.status, 0, result.stderr);
  }
});
test('production Next configuration rejects missing or local or HTTP API origins', () => {
  for(const API_ORIGIN of ['', 'http://example.invalid/api', 'https://localhost:4000', 'https://127.0.0.1:4000', 'https://user:password@example.invalid']) {
    const result = evaluate(nextUrl, {API_ORIGIN}, '');
    assert.notEqual(result.status, 0, `Unexpected accepted origin: ${API_ORIGIN}`);
  }
});
test('production Next configuration rejects demo mode and builds HTTPS proxy', () => {
  assert.notEqual(evaluate(nextUrl, {NEXT_PUBLIC_AUTH_MODE:'demo'}, '').status, 0);
  const result = evaluate(nextUrl, {}, 'const config = module.default?.default ?? module.default; const rules = await config.rewrites(); if(rules[0].destination !== "https://example.invalid/api/api/:path*") process.exit(1);');
  assert.equal(result.status, 0, result.stderr);
});
test('Netlify production serves the API on the same origin', () => {
  const result = evaluate(nextUrl, {NETLIFY:'true',API_ORIGIN:''}, 'const config = module.default?.default ?? module.default; const rules = await config.rewrites(); if(rules.length !== 0) process.exit(1);');
  assert.equal(result.status, 0, result.stderr);
});
