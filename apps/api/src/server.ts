import { fileURLToPath } from 'node:url';
import { resolve,dirname } from 'node:path';
import { configuredApp } from './configured-app.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const {app}=configuredApp(process.env.DEMO_DATA_DIR||resolve(root,'.data'));
const port=Number(process.env.PORT||process.env.API_PORT||4000);
const host=process.env.API_HOST||(process.env.APP_ENV==='prod'?'0.0.0.0':'127.0.0.1');
app.listen(port,host,()=>console.log(`Musica a la carta API listening on ${host}:${port} — ${process.env.DEMO_MODE==='true'?'local demo':'Firebase'} (${process.env.APP_ENV}).`));
