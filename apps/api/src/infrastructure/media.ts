import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { DomainError } from '../domain/model.js';
import type { MediaStore } from '../application/ports.js';
export async function sanitizeImage(buffer: Buffer, kind: 'avatar'|'banner'|'receipt') {
  if (buffer.length > (kind === 'banner' ? 8 : 4) * 1024 * 1024) throw new DomainError('IMAGE_TOO_LARGE', 'La imagen supera el tamaño permitido.', 422);
  try {
    const image=sharp(buffer,{limitInputPixels:20000000,animated:false});
    const metadata=await image.metadata();
    if (!['jpeg','png','webp'].includes(metadata.format||'')) throw new Error('Unsupported format');
    return await image.rotate().resize({width:kind==='avatar'?600:1800,height:kind==='avatar'?600:1800,fit:kind==='avatar'?'cover':'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  } catch { throw new DomainError('INVALID_IMAGE','Usá una imagen JPG, PNG o WebP válida de hasta 20 megapíxeles.',422); }
}
export class LocalMedia implements MediaStore {
  readonly directory:string;
  constructor(directory:string) {this.directory=resolve(directory);}
  async save(buffer:Buffer,kind:'avatar'|'banner'|'receipt') {
    const output=await sanitizeImage(buffer,kind),id=randomUUID(),file=`${id}.webp`;
    await mkdir(this.directory,{recursive:true}); await writeFile(this.path(file),output,{mode:0o600}); return {id,file};
  }
  path(file:string) {if (!/^[a-f0-9-]+\.webp$/.test(file)) throw new DomainError('NOT_FOUND','Imagen inválida.',404);return join(this.directory,file);}
  async read(file:string) {try {return await readFile(this.path(file));} catch(error) {if ((error as NodeJS.ErrnoException).code==='ENOENT') throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404);throw error;}}
  async remove(file:string) {await unlink(this.path(file)).catch(()=>{});}
}
