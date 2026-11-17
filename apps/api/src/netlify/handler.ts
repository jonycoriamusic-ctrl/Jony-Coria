import serverless from 'serverless-http';
import type { Express } from 'express';

// Netlify expects binary Function responses to be base64 encoded. Without this,
// serverless-http decodes WebP bytes as UTF-8 and corrupts profile images.
export function netlifyHandler(app: Express) {
  return serverless(app, { binary: ['image/webp'] });
}
