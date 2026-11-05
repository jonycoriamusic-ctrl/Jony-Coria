import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { z, ZodError } from 'zod';
import { MusicService } from './application/music-service.js';
import type { Repository } from './application/repository.js';
import { DomainError, type Actor } from './domain/model.js';
import { JsonRepository } from './infrastructure/json-repository.js';
import { LocalMedia } from './infrastructure/media.js';
import { parseCatalog } from './controllers/csv.js';
import { profileSchema, songSchema, folderSchema, showSchema, reserveSchema, idempotencySchema } from './controllers/validation.js';
import { join } from 'node:path';
import { imageMultipart } from './controllers/multipart.js';
import type { MusicApplication,MediaStore,IdentityProvider } from './application/ports.js';

export interface AppOptions {
  directory: string; demoMode?: boolean; repository?: Repository; now?: () => number;
  firebase?: {service:MusicApplication;media:MediaStore;identity:IdentityProvider;appEnv:'prod'|'non-prod';allowedOrigins:string[]};
}
export function createApp(options: AppOptions) {
  const demoMode = !options.firebase && (options.demoMode ?? process.env.DEMO_MODE === 'true');
  if (!options.firebase && (!demoMode || process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'prod')) throw new Error('Local demo requires DEMO_MODE=true and a non-production environment. Configure Firebase for production.');
  const repository = options.firebase ? undefined : options.repository ?? new JsonRepository(join(options.directory, 'demo.json'));
  const demoService = repository ? new MusicService(repository,options.now) : undefined;
  const service:MusicApplication = options.firebase?.service ?? demoService!;
  const media:MediaStore = options.firebase?.media ?? new LocalMedia(join(options.directory,'media'));
  const identity:IdentityProvider = options.firebase?.identity ?? demoService!;
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: options.firebase ? options.firebase.allowedOrigins : /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/ }));
  app.use(express.json({ limit: '1100kb' }));
  app.use((_req, res, next) => { res.set('X-Content-Type-Options','nosniff'); res.set('Referrer-Policy','no-referrer'); res.set('Cache-Control','no-store'); next(); });
  const api = express.Router();
  app.use('/api/v1', api);
  const rate = new Map<string,{count:number;reset:number}>();
  api.use((req,res,next) => {
    if (req.method === 'GET') return next();
    const key = req.headers.authorization || req.ip || 'local', current = Date.now();
    const entry = rate.get(key);
    if (!entry || entry.reset < current) rate.set(key,{count:1,reset:current+60000});
    else if (++entry.count > 90) return next(new DomainError('RATE_LIMITED','Esperá un minuto antes de volver a intentar.',429));
    if (rate.size > 10000) for (const [id,item] of rate) if (item.reset < current) rate.delete(id);
    next();
  });
  const actor = (res: Response) => res.locals.actor as Actor;
  const id = (req: Request) => String(req.params.id);
  const auth = async (req: Request,res: Response,next: NextFunction) => {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new DomainError('UNAUTHORIZED','Ingresá para continuar.',401);
    res.locals.actor = await identity.authenticate(authorization.slice(7)); next();
  };
  const musician = (req: Request,res: Response,next: NextFunction) => { if (actor(res).role !== 'musician') throw new DomainError('FORBIDDEN','Esta sección es para músicos.',403); next(); };
  const sendImage = async (res:Response,file:string,isPublic:boolean) => {
    const bytes=await media.read(file);
    res.set('Cache-Control',isPublic?'public, max-age=300':'private, no-store').type('webp').send(bytes);
  };
  api.get('/health', (_req,res) => res.json({status:'ok',mode:options.firebase?'firebase':'local-demo',environment:options.firebase?.appEnv||'non-prod',firebaseConfigured:!!options.firebase}));
  api.get('/auth/me',auth,(_req,res)=>res.json(actor(res)));
  if (demoService) {
  api.post('/demo/guest', async (_req,res) => res.status(201).json(await demoService.session('guest')));
  api.post('/demo/login', async (req,res) => {
    const input = z.object({email:z.string(),password:z.string()}).parse(req.body);
    if (input.email.toLowerCase() !== 'jony@demo.local' || input.password !== 'musica-demo') throw new DomainError('INVALID_CREDENTIALS','Usá las credenciales de demostración indicadas.',401);
    res.json(await demoService.session('musician'));
  });
  api.post('/demo/logout', auth, async (req,res) => { await demoService.logout(req.headers.authorization!.slice(7)); res.status(204).end(); });
  }
  api.get('/public/qr/:slug',async(req,res)=>res.json(await service.menu(String(req.params.slug))));
  api.get('/public/menu', async (req,res) => res.json(await service.menu(typeof req.query.slug === 'string' ? req.query.slug : options.firebase ? undefined : 'jony')));
  api.get('/public/profile', async (req,res) => res.json((await service.menu(typeof req.query.slug === 'string' ? req.query.slug : options.firebase ? undefined : 'jony')).profile));
  api.get('/public/media/:id', async (req,res,next) => { const asset = await service.asset(null,id(req)); await sendImage(res,asset.file,true); });
  api.get('/requests',auth,async (_req,res) => res.json(await service.requests(actor(res))));
  api.post('/requests',auth,async (req,res) => res.status(201).json(await service.reserve(actor(res),reserveSchema.parse(req.body),idempotencySchema.parse(req.headers['idempotency-key']))));
  api.get('/requests/:id',auth,async (req,res) => res.json(await service.request(actor(res),id(req))));
  api.post('/requests/:id/claim',auth,async (req,res) => res.json(await service.claim(actor(res),id(req))));
  api.post('/requests/:id/cancel',auth,async (req,res) => res.json(await service.cancel(actor(res),id(req))));
  api.get('/requests/:id/receipt',auth,async (req,res,next) => { const asset = await service.asset(actor(res),undefined,id(req)); await sendImage(res,asset.file,false); });
  api.post('/requests/:id/receipt',auth,imageMultipart,async (req,res) => {
    await service.request(actor(res),id(req));
    if (actor(res).role !== 'guest') throw new DomainError('FORBIDDEN','El comprobante lo adjunta el invitado.',403);
    if (!req.file) throw new DomainError('INVALID_IMAGE','Seleccioná una imagen.',422);
    const asset = await media.save(req.file.buffer,'receipt');
    try { res.json(await service.attachAsset(actor(res),asset.id,'receipt',asset.file,id(req))); } catch(error) { await media.remove(asset.file); throw error; }
  });
  api.use('/musician',auth,musician);
  api.post('/musician/onboard',async(req,res)=>{if(!service.onboard)throw new DomainError('DEMO_ONLY','El perfil demo ya está creado.',409);const input=z.object({stageName:z.string().trim().min(1).max(80),slug:z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$/)}).strict().parse(req.body);res.status(201).json(await service.onboard(actor(res),input));});
  api.get('/musician/shows/:id/requests',async(req,res)=>res.json(await service.showRequests(actor(res),id(req))));
  api.get('/musician/dashboard',async (_req,res) => res.json(await service.dashboard(actor(res))));
  api.patch('/musician/profile',async (req,res) => res.json(await service.updateProfile(actor(res),profileSchema.partial().parse(req.body))));
  api.post('/musician/profile/media',imageMultipart,async (req,res) => {
    const kind = z.enum(['avatar','banner']).parse(req.body.kind);
    if (!req.file) throw new DomainError('INVALID_IMAGE','Seleccioná una imagen.',422);
    const asset = await media.save(req.file.buffer,kind);
    try { res.json(await service.attachAsset(actor(res),asset.id,kind,asset.file)); } catch(error) { await media.remove(asset.file); throw error; }
  });
  api.delete('/musician/profile/media/:kind',async (req,res) => res.json(await service.removeProfileAsset(actor(res),z.enum(['avatar','banner']).parse(req.params.kind))));
  api.post('/musician/folders',async (req,res) => res.status(201).json(await service.saveFolder(actor(res),folderSchema.parse(req.body).name)));
  api.patch('/musician/folders/:id',async (req,res) => res.json(await service.saveFolder(actor(res),folderSchema.parse(req.body).name,id(req))));
  api.delete('/musician/folders/:id',async (req,res) => res.json(await service.deleteFolder(actor(res),id(req))));
  api.post('/musician/songs',async (req,res) => res.status(201).json(await service.saveSong(actor(res),songSchema.parse(req.body))));
  api.patch('/musician/songs/:id',async (req,res) => res.json(await service.saveSong(actor(res),songSchema.partial().parse(req.body),id(req))));
  api.delete('/musician/songs/:id',async (req,res) => res.json(await service.saveSong(actor(res),{enabled:false},id(req))));
  api.post('/musician/songs/import/preview',async (req,res) => { const rows = parseCatalog(z.object({csv:z.string()}).parse(req.body).csv); res.json({ rows, count:rows.length }); });
  api.post('/musician/songs/import',async (req,res) => { const input=z.object({csv:z.string(),folderId:z.string().min(1).max(128).nullable().optional()}).strict().parse(req.body);res.json(await service.importSongs(actor(res),parseCatalog(input.csv),input.folderId??null)); });
  api.post('/musician/shows',async (req,res) => res.status(201).json(await service.saveShow(actor(res),showSchema.parse(req.body))));
  api.patch('/musician/shows/:id',async (req,res) => res.json(await service.saveShow(actor(res),showSchema.partial().parse(req.body),id(req))));
  api.post('/musician/shows/:id/action',async (req,res) => res.json(await service.showAction(actor(res),id(req),z.object({action:z.enum(['open','pause','resume','close','finish'])}).parse(req.body).action)));
  api.patch('/musician/shows/:id/queue',async (req,res) => res.json(await service.reorder(actor(res),id(req),z.object({requestIds:z.array(z.string()).max(500)}).parse(req.body).requestIds)));
  api.post('/musician/requests/:id/performance',async (req,res) => res.json(await service.perform(actor(res),id(req),z.object({status:z.enum(['playing','played','not_performed'])}).parse(req.body).status)));
  app.use((_req,_res,next) => next(new DomainError('NOT_FOUND','No encontramos esa página.',404)));
  app.use((error: unknown,_req: Request,res: Response,_next: NextFunction) => {
    if (error instanceof DomainError) return res.status(error.status).json({error:{code:error.code,message:error.message}});
    if (error instanceof ZodError) return res.status(422).json({error:{code:'VALIDATION_ERROR',message:'Revisá los datos ingresados.',fields:error.issues.map(issue=>({path:issue.path.join('.'),message:issue.message}))}});
    if (error instanceof multer.MulterError) return res.status(422).json({error:{code:'INVALID_IMAGE',message:'Usá una sola imagen de hasta 8 MB.'}});
    if ((error as {type?:string}).type === 'entity.too.large') return res.status(413).json({error:{code:'TOO_LARGE',message:'El contenido es demasiado grande.'}});
    console.error('API operation failed:',error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({error:{code:'INTERNAL_ERROR',message:'No pudimos guardar el cambio. Intentá nuevamente.'}});
  });
  return { app, service, repository };
}
