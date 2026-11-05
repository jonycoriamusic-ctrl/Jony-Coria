import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import sharp from 'sharp';
import { CloudinaryMedia } from './media.js';

const credentials = { cloudName: 'test-cloud', apiKey: 'test-key', apiSecret: 'test-secret' };
const image = () => sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();

test('all uploaded images are sanitized and authenticated; provider credentials and delivery URLs are never persisted', async () => {
  const uploads: Array<Record<string,unknown>> = [];
  const client = { uploader: { upload_stream(options: Record<string,unknown>, callback: (error: unknown, result: unknown) => void) {
    uploads.push(options);
    const chunks: Buffer[] = [];
    return new Writable({write(chunk,_encoding,done){chunks.push(chunk);done();}, final(done){
      void sharp(Buffer.concat(chunks)).metadata().then(metadata => {
        assert.equal(metadata.format,'webp');
        callback(null,{public_id:options.public_id,type:'authenticated'});done();
      }).catch(done);
    }});
  }}, utils: {} } as unknown as ConstructorParameters<typeof CloudinaryMedia>[1];
  const store = new CloudinaryMedia(credentials,client);
  for (const kind of ['avatar','banner','receipt'] as const) {
    const stored = await store.save(await image(),kind);
    assert.match(stored.file,/^cloudinary:authenticated:musica\/(receipts|profiles)\//);
    assert.ok(!JSON.stringify(stored).includes(credentials.apiSecret));
    assert.ok(!JSON.stringify(stored).includes('https:'));
  }
  assert.equal(uploads.length,3);
  assert.ok(uploads.every(options => options.type === 'authenticated' && options.overwrite === false));
  await assert.rejects(store.save(Buffer.from('<svg>not an image</svg>'),'receipt'));
  assert.equal(uploads.length,3);
});

test('private read signs an expiring server-only URL and rejects arbitrary paths before network access', async () => {
  let calls=0;
  const client = {uploader:{},utils:{private_download_url(id:string,format:string,options:Record<string,unknown>){
    assert.equal(format,'webp');assert.equal(options.type,'authenticated');
    assert.ok(Number(options.expires_at) <= Math.floor(Date.now()/1000)+60);
    assert.match(id,/^musica\/receipts\//);
    return 'https://api.cloudinary.com/v1_1/test-cloud/image/download?signature=synthetic';
  }}} as unknown as ConstructorParameters<typeof CloudinaryMedia>[1];
  const fetcher = (async (_url,options) => {
    calls++;assert.equal(options?.redirect,'error');return new Response(new Uint8Array([1,2,3]));
  }) as typeof fetch;
  const store = new CloudinaryMedia(credentials,client,fetcher);
  assert.deepEqual(await store.read('cloudinary:authenticated:musica/receipts/00000000-0000-0000-0000-000000000000'),Buffer.from([1,2,3]));
  await assert.rejects(store.read('https://attacker.example/image'));
  await assert.rejects(store.read('cloudinary:authenticated:musica/receipts/../../another-user'));
  assert.equal(calls,1);
});

test('provider responses cannot redirect private image fetches to another host', async () => {
  let fetched=false;
  const client={uploader:{},utils:{private_download_url(){return 'https://attacker.example/private';}}} as unknown as ConstructorParameters<typeof CloudinaryMedia>[1];
  const store=new CloudinaryMedia(credentials,client,(async()=>{fetched=true;return new Response();}) as typeof fetch);
  await assert.rejects(store.read('cloudinary:authenticated:musica/receipts/00000000-0000-0000-0000-000000000000'));
  assert.equal(fetched,false);
});
