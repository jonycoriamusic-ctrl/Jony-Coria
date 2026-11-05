import type { SongInput } from '@musica/contracts';
import { DomainError } from '../domain/model.js';
import { songSchema } from './validation.js';
/** Bounded RFC-style CSV parser supporting escaped quotes and CRLF. */
export function parseCatalog(csv: string): SongInput[] {
  if (Buffer.byteLength(csv, 'utf8') > 1024 * 1024) throw new DomainError('CSV_TOO_LARGE', 'El archivo supera 1 MB.', 422);
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (c === '"') { if (quoted && csv[i+1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && csv[i+1] === '\n') i++; row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
    if (rows.length > 2001) throw new DomainError('CSV_TOO_LARGE', 'Usá hasta 2000 canciones por archivo.', 422);
  }
  if (quoted) throw new DomainError('INVALID_CSV', 'El archivo tiene comillas sin cerrar.', 422);
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map(cell => cell.replace(/^\uFEFF/, '').toLowerCase()) ?? [];
  if (!headers.includes('title') || !headers.includes('artist') || headers.some(header => !['title','artist','genre','song_code','active'].includes(header))) throw new DomainError('INVALID_CSV', 'Usá las columnas title y artist; opcional: active.', 422);
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new DomainError('INVALID_CSV', `La fila ${index+2} tiene columnas de más o de menos.`, 422);
    const source = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    if (source.active && !['true','false','1','0'].includes(source.active.toLowerCase())) throw new DomainError('INVALID_CSV', `Revisá active en la fila ${index+2}.`, 422);
    const result = songSchema.safeParse({ title: source.title, artist: source.artist, folderId: null, enabled: !['false','0'].includes((source.active || 'true').toLowerCase()) });
    if (!result.success) throw new DomainError('INVALID_CSV', `Revisá el título y artista de la fila ${index+2}.`, 422);
    return result.data;
  });
}
