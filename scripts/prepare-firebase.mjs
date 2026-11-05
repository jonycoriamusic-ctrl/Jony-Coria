import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

// Preparation only: this script never contacts Firebase or deploys resources.
const build = spawnSync('npm', ['run', 'build', '-w', '@musica/api'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
let source = await readFile(new URL('../config/functions.prod.env.example', import.meta.url), 'utf8');
const values = parseEnv(source);
if (values.APP_ENV !== 'prod' || values.DEMO_MODE !== 'false') throw new Error('Production configuration must disable demo mode.');
if (Object.keys(values).some(key => key.startsWith('FIREBASE_'))) throw new Error('Firebase-reserved dotenv variables are forbidden.');
if (values.MEDIA_PROVIDER === 'cloudinary') {
  let local = {};
  try { local = parseEnv(await readFile(new URL('../.env.cloudinary.local', import.meta.url), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || local.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || local.CLOUDINARY_API_KEY;
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName || '') || !/^\d+$/.test(apiKey || '')) {
    throw new Error('Cloudinary cloud name and API key are required for release preparation.');
  }
  source += `CLOUDINARY_CLOUD_NAME=${cloudName}\nCLOUDINARY_API_KEY=${apiKey}\n`;
}
await writeFile(new URL('../apps/api/dist/.env.jony-coria', import.meta.url), source, { mode: 0o600 });
console.log('Prepared the jony-coria production function bundle. No deployment performed.');
