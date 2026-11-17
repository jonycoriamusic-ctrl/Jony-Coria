import { configuredApp } from '../../apps/api/src/configured-app.js';
import { netlifyHandler } from '../../apps/api/src/netlify/handler.js';

if (process.env.APP_ENV !== 'prod' || process.env.DEMO_MODE === 'true') {
  throw new Error('The Netlify API requires production Firebase configuration.');
}

export const handler = netlifyHandler(configuredApp('/tmp/musica-unused').app);
