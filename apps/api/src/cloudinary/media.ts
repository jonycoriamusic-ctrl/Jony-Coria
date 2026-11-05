import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import type { MediaStore } from '../application/ports.js';
import { DomainError } from '../domain/model.js';
import { sanitizeImage } from '../infrastructure/media.js';

export interface CloudinaryConfig { cloudName: string; apiKey: string; apiSecret: string; }
type MediaClient = Pick<typeof cloudinary, 'uploader'|'utils'>;
const maximumDownloadBytes = 8 * 1024 * 1024;

export class CloudinaryMedia implements MediaStore {
  private options: { cloud_name: string; api_key: string; api_secret: string; secure: boolean; };
  constructor(config: CloudinaryConfig, private client: MediaClient = cloudinary, private fetcher: typeof fetch = fetch) {
    if (!/^[a-zA-Z0-9_-]+$/.test(config.cloudName) || !config.apiKey || !config.apiSecret || /^\*+$/.test(config.apiSecret)) {
      throw new Error('Cloudinary server credentials are required.');
    }
    this.options = { cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true };
  }
  async save(buffer: Buffer, kind: 'avatar'|'banner'|'receipt') {
    const bytes = await sanitizeImage(buffer, kind), id = randomUUID();
    const publicId = `musica/${kind === 'receipt' ? 'receipts' : 'profiles'}/${id}`;
    await new Promise<void>((resolve, reject) => {
      const stream = this.client.uploader.upload_stream({
        ...this.options, public_id: publicId, resource_type: 'image', type: 'authenticated',
        format: 'webp', overwrite: false, unique_filename: false, timeout: 30000,
      }, (error, result) => {
        if (error || !result || result.public_id !== publicId || result.type !== 'authenticated') {
          reject(new DomainError('MEDIA_UNAVAILABLE', 'No pudimos guardar la imagen. Probá de nuevo.', 503));
        } else resolve();
      });
      stream.on('error', () => reject(new DomainError('MEDIA_UNAVAILABLE', 'No pudimos guardar la imagen.', 503)));
      stream.end(bytes);
    });
    // Never persist delivery URLs or signatures, and never return API secrets.
    return { id, file: `cloudinary:authenticated:${publicId}` };
  }
  private publicId(file: string) {
    if (!/^cloudinary:authenticated:musica\/(receipts|profiles)\/[a-f0-9-]{36}$/.test(file)) {
      throw new DomainError('NOT_FOUND', 'No encontramos esa imagen.', 404);
    }
    return file.slice('cloudinary:authenticated:'.length);
  }
  async read(file: string): Promise<Buffer> {
    const publicId = this.publicId(file);
    // Express checks asset ownership before invoking this adapter. Signed URLs stay server-side.
    const url = this.client.utils.private_download_url(publicId, 'webp', {
      ...this.options, type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false,
    });
    if (new URL(url).origin !== 'https://api.cloudinary.com') throw new Error('Unexpected media download origin.');
    const response = await this.fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (response.status === 404) throw new DomainError('NOT_FOUND', 'No encontramos esa imagen.', 404);
    if (!response.ok || !response.body) throw new DomainError('MEDIA_UNAVAILABLE', 'No pudimos cargar la imagen.', 503);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maximumDownloadBytes) { await reader.cancel(); throw new DomainError('MEDIA_UNAVAILABLE', 'La imagen supera el tamaño permitido.', 503); }
        chunks.push(value);
      }
      return Buffer.concat(chunks, size);
    } finally { reader.releaseLock(); }
  }
  async remove(file: string): Promise<void> {
    const publicId = this.publicId(file);
    const options = { ...this.options, resource_type: 'image' as const, type: 'authenticated' as const, invalidate: true, timeout: 15000 };
    const result = await this.client.uploader.destroy(publicId, options);
    if (result.result !== 'ok' && result.result !== 'not found') throw new Error('Cloudinary could not remove the asset.');
  }
}
