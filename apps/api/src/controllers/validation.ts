import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1);
const money = z.number().int().min(100).max(100000000);
const link = z.union([z.literal(''), z.url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }, 'Usá un enlace HTTPS válido.')]);
const phone = text(30).refine(value => !value || /^[+\d\s()-]{5,30}$/.test(value), 'Ingresá un teléfono válido.');
export const profileSchema = z.object({
  stageName: required(80), bio: text(1000), location: text(120), publicEmail: z.union([z.literal(''), z.email()]),
  whatsapp: phone, website: link, socialLinks: z.array(z.object({ platform: required(40), url: link.refine(value => value.length > 0) }).strict()).max(10),
  standardPrice: money, dedicationSurcharge: z.number().int().min(0).max(100000000), alias: required(50), cbu: z.union([z.literal(''), z.string().trim().regex(/^\d{22}$/, 'Ingresá un CBU de 22 dígitos.')]), accountName: required(120), version: z.number().int().positive().optional(),
}).strict();
export const songSchema = z.object({ title: required(150), artist: required(150), folderId: z.union([required(128), z.null()]).optional(), enabled: z.boolean().optional() }).strict();
export const folderSchema = z.object({ name: required(60) }).strict();
export const showSchema = z.object({ title: required(120), venue: required(120), date: z.string().refine(value => Number.isFinite(Date.parse(value)), 'Fecha inválida.'), capacity: z.number().int().min(1).max(500), songIds: z.array(required(100)).max(2000).optional(), version: z.number().int().positive().optional() }).strict();
export const reserveSchema = z.object({ showId: required(100), songId: required(100), type: z.enum(['standard','dedication']), dedication: text(280).optional(), guestName: text(60).optional(), expectedPrice: money }).strict().refine(input => input.type !== 'dedication' || !!input.dedication?.trim(), { message: 'Escribí una dedicatoria.', path: ['dedication'] });
export const idempotencySchema = z.string().min(8).max(150).regex(/^[A-Za-z0-9_-]+$/);
