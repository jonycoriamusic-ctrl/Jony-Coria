import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
  ?? join(homedir(), '.config/musicaalacarta/firebase-service-account.json');
const cloudinaryPath = process.env.CLOUDINARY_ENV_FILE
  ?? join(root, '.env.cloudinary.local');

if (Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error('Manual Netlify releases require Node.js 22.');
}
if (!existsSync(join(root, 'apps/web/.netlify/static/_next/static')) || !existsSync(join(root, 'apps/web/.netlify/functions/api.zip'))) {
  throw new Error('Build the web app and Netlify functions before deploying. See docs/NETLIFY-RELEASE.md.');
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
if (serviceAccount.project_id !== 'jony-coria' || !serviceAccount.private_key || !serviceAccount.client_email) {
  throw new Error('The local Firebase service account must belong to jony-coria.');
}
const cloudinary = parseEnv(readFileSync(cloudinaryPath, 'utf8'));
if (!cloudinary.CLOUDINARY_API_KEY || !cloudinary.CLOUDINARY_API_SECRET) {
  throw new Error('The local Cloudinary credential file is incomplete.');
}

const result = spawnSync('npx', [
  '--yes', 'netlify-cli@27.20.0', 'deploy', '--no-build', '--prod',
  '--site', 'f553f3eb-8a97-416b-b6cf-8837d4aef5c5',
  '--filter', '@musica/web',
  '--dir', 'apps/web/.netlify/static',
  '--secret-env', `FIREBASE_SERVICE_ACCOUNT_JSON=${JSON.stringify(serviceAccount)}`,
  '--secret-env', `CLOUDINARY_API_KEY=${cloudinary.CLOUDINARY_API_KEY}`,
  '--secret-env', `CLOUDINARY_API_SECRET=${cloudinary.CLOUDINARY_API_SECRET}`,
], { cwd: root, stdio: 'inherit', env: process.env });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
