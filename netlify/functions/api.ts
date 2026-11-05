import serverless from 'serverless-http';
import { configuredApp } from '../../apps/api/src/configured-app.js';

if (process.env.APP_ENV !== 'prod' || process.env.DEMO_MODE === 'true') {
  throw new Error('The Netlify API requires production Firebase configuration.');
}

export const handler = serverless(configuredApp('/tmp/musica-unused').app);
