import { randomUUID } from 'node:crypto';
import type { Storage } from 'firebase-admin/storage';
type Bucket = ReturnType<Storage['bucket']>;
import type { MediaStore } from '../application/ports.js';
import { DomainError } from '../domain/model.js';
import { sanitizeImage } from '../infrastructure/media.js';
export class FirebaseMedia implements MediaStore {
  constructor(private bucket: Bucket) {}
  async save(buffer: Buffer, kind: 'avatar'|'banner'|'receipt') {
    const bytes=await sanitizeImage(buffer,kind), id=randomUUID();
    const file=`${kind==='receipt'?'private-receipts':'profile-media'}/${id}.webp`;
    await this.bucket.file(file).save(bytes,{resumable:false,validation:'crc32c',metadata:{contentType:'image/webp',cacheControl:'private, no-store'}});
    return {id,file};
  }
  private object(file: string) { if (!/^(private-receipts|profile-media)\/[a-f0-9-]+\.webp$/.test(file)) throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404); return this.bucket.file(file); }
  async read(file:string) { try { const [bytes]=await this.object(file).download(); return bytes; } catch(error) { if ((error as {code?:number}).code===404) throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404); throw error; } }
  async remove(file:string) { await this.object(file).delete({ignoreNotFound:true}); }
}
