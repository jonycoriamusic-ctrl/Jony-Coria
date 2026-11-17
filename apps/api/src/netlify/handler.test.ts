import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import sharp from 'sharp';
import { netlifyHandler } from './handler.js';

test('Netlify Function preserves profile WebP bytes and keeps JSON as text', async () => {
  const image = await sharp({ create: { width: 12, height: 8, channels: 3, background: '#ffffff' } }).webp().toBuffer();
  const app = express();
  app.get('/image', (_req, res) => res.type('webp').send(image));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  const handler = netlifyHandler(app);
  const event = (path: string) => ({ httpMethod: 'GET', path, headers: {}, requestContext: {} });
  const context = { getRemainingTimeInMillis: () => 30000 };
  type FunctionResponse = { statusCode: number; isBase64Encoded: boolean; body: string };

  const imageResponse = await handler(event('/image') as never, context as never) as FunctionResponse;
  assert.equal(imageResponse.statusCode, 200);
  assert.equal(imageResponse.isBase64Encoded, true);
  const decoded = Buffer.from(imageResponse.body, 'base64');
  assert.deepEqual(decoded, image);
  assert.equal((await sharp(decoded).metadata()).format, 'webp');

  const healthResponse = await handler(event('/health') as never, context as never) as FunctionResponse;
  assert.equal(healthResponse.statusCode, 200);
  assert.equal(healthResponse.isBase64Encoded, false);
  assert.deepEqual(JSON.parse(healthResponse.body), { status: 'ok' });
});
