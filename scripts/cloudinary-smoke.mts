import assert from 'node:assert/strict';
import sharp from 'sharp';
import { CloudinaryMedia } from '../apps/api/src/cloudinary/media.js';

const cloudName=process.env.CLOUDINARY_CLOUD_NAME||'';
const media = new CloudinaryMedia({cloudName,apiKey:process.env.CLOUDINARY_API_KEY||'',apiSecret:process.env.CLOUDINARY_API_SECRET||''});
const input=await sharp({create:{width:16,height:16,channels:3,background:'#ffffff'}}).png().toBuffer();
let stored: Awaited<ReturnType<CloudinaryMedia['save']>> | undefined;
try {
 stored=await media.save(input,'receipt');
 const original=await media.read(stored.file);
 assert.equal((await sharp(original).metadata()).format,'webp');
 const id=stored.file.slice('cloudinary:authenticated:'.length);
 const unsigned=await fetch(`https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/authenticated/${id}.webp`,{signal:AbortSignal.timeout(15000)});
 assert.ok([401,403,404].includes(unsigned.status),'Unsigned receipt must be inaccessible');
 console.log(JSON.stringify({upload:'passed',authorizedDownload:'passed',unsignedDownload:'blocked',format:'webp'}));
} catch {
 console.error('Cloudinary live smoke test failed. Credentials and signed URLs are intentionally omitted.');
 process.exitCode=1;
} finally {
 if(stored) {
  try {await media.remove(stored.file);console.log('Synthetic smoke-test asset removed.');}
  catch {console.error('Could not remove synthetic smoke-test asset; manual cleanup required.');process.exitCode=1;}
 }
}
