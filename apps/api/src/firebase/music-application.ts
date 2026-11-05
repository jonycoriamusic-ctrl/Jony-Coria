import { createHash,randomUUID } from 'node:crypto';
import type { Firestore,DocumentSnapshot,Transaction } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { CreateRequestInput,DashboardResponse,MenuResponse,MusicianProfile,ProfileInput,ShowInput,SongInput,SongFolder,MusicRequest,Show,Song } from '@musica/contracts';
import type { MusicApplication } from '../application/ports.js';
import { assertMusician,DomainError,type Actor,type StoredRequest,type StoredShow,type StoredSong } from '../domain/model.js';

type ProfileDoc=Omit<MusicianProfile,'dedicationSurcharge'>&{dedicationSurcharge?:number;dedicationPrice?:number;activeShowId:string|null;catalogVersion:string;enabled:boolean;folders?:SongFolder[];songCount?:number};
type ShowDoc=StoredShow&{nextQueueRank:number;playingRequestId:string|null;songCounts:Record<string,number>};
type RequestDoc=StoredRequest&{receiptAssetId?:string};
type AssetDoc={musicianId:string;kind:'avatar'|'banner'|'receipt';requestId?:string;file:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
function identifier(value:string) {if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new DomainError('NOT_FOUND','No encontramos ese recurso.',404);return value;}
function data<T>(snap:DocumentSnapshot,code='NOT_FOUND'):T {if (!snap.exists) throw new DomainError(code,code==='PROFILE_REQUIRED'?'Completá tu perfil para continuar.':'No encontramos ese recurso.',404);return snap.data() as T;}
function surcharge(p:ProfileDoc):number {return p.dedicationSurcharge??Math.max(0,(p.dedicationPrice??p.standardPrice)-p.standardPrice);}
function pricingReview(p:ProfileDoc):boolean {return p.dedicationSurcharge===undefined&&p.dedicationPrice!==undefined&&p.dedicationPrice<p.standardPrice;}
function profileDto(p:ProfileDoc):MusicianProfile {return {id:p.id,slug:p.slug,stageName:p.stageName,bio:p.bio,location:p.location,avatarUrl:p.avatarUrl,bannerUrl:p.bannerUrl,publicEmail:p.publicEmail,whatsapp:p.whatsapp,website:p.website,socialLinks:p.socialLinks,standardPrice:p.standardPrice,dedicationSurcharge:surcharge(p),pricingReviewRequired:pricingReview(p),version:p.version,alias:p.alias,cbu:p.cbu??'',accountName:p.accountName};}
function showDto(s:ShowDoc):Show {const {musicianId:_owner,nextQueueRank:_rank,playingRequestId:_playing,songCounts:_counts,...show}=s;return show;}
function requestDto(r:RequestDoc):MusicRequest {const {guestId:_guest,musicianId:_owner,capacityRetained:_capacity,receiptAssetId:_asset,...request}=r;return request;}
function songDto(s:StoredSong):Song {return {id:s.id,title:s.title,artist:s.artist,folderId:s.folderId??null,enabled:s.enabled};}
function version(expected:number|undefined,actual:number) {if (expected!==undefined && expected!==actual) throw new DomainError('STALE_VERSION','La información cambió. Actualizá e intentá de nuevo.');}
function own(r:RequestDoc,actor:Actor) {if (actor.role==='guest'?r.guestId!==actor.id:r.musicianId!==assertMusician(actor)) throw new DomainError('NOT_FOUND','No encontramos ese pedido.',404);}

/** Firestore commands use scoped documents, tenant queries and show counters; never a global-state snapshot. */
export class FirebaseMusicApplication implements MusicApplication {
 constructor(private db:Firestore,private now:()=>number=Date.now,private auth?:Auth) {}
 private readonly readCache=new Map<string,{expires:number;value:Promise<unknown>}>();
 private cached<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<T> {
  const hit=this.readCache.get(key);if(hit&&hit.expires>this.now())return hit.value as Promise<T>;
  if(this.readCache.size>200)this.readCache.delete(this.readCache.keys().next().value!);
  const value=load().catch(error=>{if(this.readCache.get(key)?.value===value)this.readCache.delete(key);throw error;});
  this.readCache.set(key,{expires:this.now()+ttl,value});return value;
 }
 private readCatalog(p:ProfileDoc) {return this.cached(`catalog:${p.id}:${p.catalogVersion}:${p.version}`,600000,async()=>{const snapshot=await this.catalog(p).limit(2000).get();return snapshot.docs.map(d=>data<StoredSong>(d));});}
 private invalidateViews(uid?:string) {for(const key of this.readCache.keys())if(key.startsWith('menu:')||uid&&key.startsWith(`shows:${uid}:`))this.readCache.delete(key);}

 private profileRef(uid:string) {return this.db.collection('musicians').doc(identifier(uid));}
 private showRef(id:string) {return this.db.collection('shows').doc(identifier(id));}
 private requestRef(id:string) {return this.db.collection('requests').doc(identifier(id));}
 private catalog(p:ProfileDoc) {return this.profileRef(p.id).collection('catalogs').doc(p.catalogVersion).collection('songs');}
 private publicSignal(tx:Transaction,slug:string,show?:ShowDoc|null) {
  tx.set(this.db.collection('publicUpdates').doc(identifier(slug)),{revision:randomUUID(),...(show===undefined?{}:{showId:show?.id??null,capacity:show?.capacity??null,occupiedCount:show?.occupiedCount??null,status:show?.status??null})},{merge:true});
 }
 private audit(tx:Transaction,actor:Actor,event:string,resourceId:string,musicianId:string) {tx.set(this.profileRef(musicianId).collection('events').doc(),{actorId:actor.id,event,resourceId,at:new Date(this.now()).toISOString()});}
 private async profile(uid:string) {const p=data<ProfileDoc>(await this.profileRef(uid).get(),'PROFILE_REQUIRED');if (!p.enabled) throw new DomainError('FORBIDDEN','Esta cuenta está desactivada.',403);return p;}
 private async reconcileSchedule(uid:string):Promise<void> {
  const windowMs=24*60*60*1000,now=this.now();
  for(let attempt=0;attempt<2;attempt++) {
   const p=await this.profile(uid);
   // Legacy offset timestamps may sort after the equivalent UTC instant; include a bounded offset horizon, then compare parsed instants.
   const snapshot=await this.db.collection('shows').where('musicianId','==',uid).where('date','<=',new Date(now+24*60*60*1000).toISOString()).orderBy('date','desc').limit(100).get();
   const latest=snapshot.docs.map(doc=>data<ShowDoc>(doc)).filter(show=>Date.parse(show.date)<=now&&now<Date.parse(show.date)+windowMs).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0];
   const scheduled=latest?.status==='finished'?undefined:latest;
   const active=p.activeShowId?data<ShowDoc>(await this.showRef(p.activeShowId).get()):null;
   const expired=!!active&&now>=Date.parse(active.date)+windowMs;
   let ready=false;
   if(scheduled?.status==='draft') {
    const verified=!!this.auth&&await this.auth.getUser(uid).then(user=>user.emailVerified).catch(()=>false);
    if(verified&&!pricingReview(p)&&p.alias&&p.accountName&&p.standardPrice>=100) {
     const catalog=await this.readCatalog(p);
     ready=catalog.some(song=>song.enabled&&scheduled.songIds.includes(song.id));
    }
   } else ready=!!scheduled;
   const switchTo=ready&&scheduled&&(!active||scheduled.id!==active.id&&Date.parse(scheduled.date)>Date.parse(active.date))?scheduled:null;
   const finishOld=active&&(expired||switchTo&&active.id!==switchTo.id||latest?.status==='finished'&&latest.id!==active.id&&Date.parse(latest.date)>Date.parse(active.date))?active:null;
   if(!switchTo&&!finishOld)return;
   const changed=await this.db.runTransaction(async tx=>{
    const profileRef=this.profileRef(uid),current=data<ProfileDoc>(await tx.get(profileRef),'PROFILE_REQUIRED');
    if(current.version!==p.version||current.activeShowId!==p.activeShowId)return false;
    const oldRef=finishOld?this.showRef(finishOld.id):null,newRef=switchTo?this.showRef(switchTo.id):null;
    const [oldSnap,newSnap]=await Promise.all([oldRef?tx.get(oldRef):Promise.resolve(null),newRef?tx.get(newRef):Promise.resolve(null)]);
    const old=oldSnap?data<ShowDoc>(oldSnap):null,next=newSnap?data<ShowDoc>(newSnap):null;
    if(old&&(old.version!==finishOld!.version||old.musicianId!==uid))return false;
    if(next&&(next.version!==switchTo!.version||next.musicianId!==uid||Date.parse(next.date)>now||now>=Date.parse(next.date)+windowMs||next.status==='finished'))return false;
    if(oldRef&&old)tx.update(oldRef,{status:'finished',version:old.version+1});
    if(newRef&&next&&next.status==='draft')tx.update(newRef,{status:'open',version:next.version+1});
    tx.update(profileRef,{activeShowId:next?.id??null,version:current.version+1});
    this.publicSignal(tx,current.slug,next?{...next,status:next.status==='draft'?'open':next.status}:null);
    return true;
   });
   if(!changed)continue;
   this.invalidateViews(uid);
   if(finishOld)await this.cleanupShow(finishOld.id,true);
   return;
  }
 }
 async onboard(actor:Actor,input:{stageName:string;slug:string}) {
  this.invalidateViews(actor.musicianId);
  const uid=assertMusician(actor),profileRef=this.profileRef(uid),slugRef=this.db.collection('musicianSlugs').doc(input.slug);
  return this.db.runTransaction(async tx=>{
   const [existing,slug]=await Promise.all([tx.get(profileRef),tx.get(slugRef)]);
   if (existing.exists) return profileDto(data<ProfileDoc>(existing));
   if (slug.exists) throw new DomainError('SLUG_TAKEN','Ese enlace ya está en uso. Elegí otro.');
   const p:ProfileDoc={id:uid,slug:input.slug,stageName:input.stageName,bio:'',location:'',avatarUrl:'',bannerUrl:'',publicEmail:'',whatsapp:'',website:'',socialLinks:[],standardPrice:0,dedicationSurcharge:0,alias:'',cbu:'',accountName:'',version:1,activeShowId:null,catalogVersion:'initial',enabled:true,folders:[],songCount:0};
   tx.create(profileRef,p);tx.create(slugRef,{musicianId:uid});this.audit(tx,actor,'profile.created',uid,uid);return profileDto(p);
  });
 }
 private async cleanupShow(showId:string,finish=false) {
  for (let pass=0;pass<6;pass++) {
   const count=await this.db.runTransaction(async tx=>{
    const ref=this.showRef(showId),showSnap=await tx.get(ref);if (!showSnap.exists) return 0;
    const show=data<ShowDoc>(showSnap);
    let query=this.db.collection('requests').where('showId','==',showId).where('status','==','held');
    if (!finish) query=query.where('expiresAt','<=',new Date(this.now()).toISOString());
    const expired=await tx.get(query.limit(100));
    const profile=expired.size?data<ProfileDoc>(await tx.get(this.profileRef(show.musicianId))):null;
    for (const doc of expired.docs) {const r=data<RequestDoc>(doc);tx.update(doc.ref,{status:'expired',capacityRetained:false,version:r.version+1});show.occupiedCount=Math.max(0,show.occupiedCount-1);show.songCounts[r.songId]=Math.max(0,(show.songCounts[r.songId]||0)-1);}
    if (expired.size) {tx.update(ref,{occupiedCount:show.occupiedCount,songCounts:show.songCounts,version:show.version+1});if(profile!.activeShowId===show.id)this.publicSignal(tx,profile!.slug,show);}return expired.size;
   });
   if (count<100) break;
  }
 }
 async menu(slug?:string):Promise<MenuResponse> {
  if (!slug || !/^[a-z0-9-]{3,60}$/.test(slug)) throw new DomainError('MUSICIAN_REQUIRED','Abrí el enlace o QR de tu músico.',404);
  return this.cached(`menu:${slug}`,5000,async()=>{
  const registry=data<{musicianId:string}>(await this.db.collection('musicianSlugs').doc(slug).get());
  await this.reconcileSchedule(registry.musicianId);
  let p=await this.profile(registry.musicianId);
  if (p.activeShowId) await this.cleanupShow(p.activeShowId);
  p=await this.profile(registry.musicianId);
  const show=p.activeShowId?data<ShowDoc>(await this.showRef(p.activeShowId).get()):null;
  const catalog=show?await this.readCatalog(p):[];
  const {alias:_alias,cbu:_cbu,accountName:_account,...publicProfile}=profileDto(p);
  return {demo:false,profile:publicProfile,folders:p.folders??[],show:show?showDto(show):null,songs:catalog.filter(s=>s.enabled&&!!show&&show.songIds.includes(s.id)).map(s=>({...songDto(s),available:show?.status==='open'&&show.occupiedCount<show.capacity,requestCount:show?.songCounts[s.id]||0})),remaining:show?Math.max(0,show.capacity-show.occupiedCount):0,serverTime:new Date(this.now()).toISOString()};
  });
 }
 async dashboard(actor:Actor):Promise<DashboardResponse> {
  const uid=assertMusician(actor);await this.reconcileSchedule(uid);const p=await this.profile(uid);
  const [songs,shows]=await Promise.all([this.readCatalog(p),this.cached(`shows:${uid}:${p.version}`,30000,async()=>{const snapshot=await this.db.collection('shows').where('musicianId','==',uid).orderBy('date','desc').limit(30).get();return snapshot.docs.map(d=>showDto(data<ShowDoc>(d)));})]);
  // Queue reads have their own selected-show endpoint; never duplicate them in metadata polling.
  return {demo:false,profile:profileDto(p),folders:p.folders??[],songs:songs.map(songDto),shows,requests:[],activeShowId:p.activeShowId};
 }
 async showRequests(actor:Actor,id:string) {
  const uid=assertMusician(actor),show=data<ShowDoc>(await this.showRef(id).get());if(show.musicianId!==uid)throw new DomainError('NOT_FOUND','No encontramos ese show.',404);
  await this.cleanupShow(id,show.status==='finished');
  const snapshot=await this.db.collection('requests').where('showId','==',id).where('capacityRetained','==',true).limit(501).get();
  if(snapshot.size>500)throw new DomainError('CAPACITY_INTEGRITY_ERROR','No pudimos cargar la fila completa.',500);
  return snapshot.docs.map(d=>requestDto(data<RequestDoc>(d)));
 }
 async requests(actor:Actor) {
  const field=actor.role==='guest'?'guestId':'musicianId',value=actor.role==='guest'?actor.id:assertMusician(actor);
  const snapshot=await this.db.collection('requests').where(field,'==',value).orderBy('createdAt','desc').limit(100).get();
  const showIds=[...new Set(snapshot.docs.map(d=>data<RequestDoc>(d)).filter(r=>r.status==='held').map(r=>r.showId))];
  for (const id of showIds) await this.cleanupShow(id);
  const current=showIds.length?await this.db.collection('requests').where(field,'==',value).orderBy('createdAt','desc').limit(100).get():snapshot;
  return current.docs.map(d=>requestDto(data<RequestDoc>(d)));
 }
 async request(actor:Actor,id:string) {
  let r=data<RequestDoc>(await this.requestRef(id).get());own(r,actor);
  if (r.status==='held') {await this.cleanupShow(r.showId);r=data<RequestDoc>(await this.requestRef(id).get());own(r,actor);}
  return requestDto(r);
 }
 async reserve(actor:Actor,input:CreateRequestInput,key:string) {
  this.invalidateViews(undefined);
  if (actor.role!=='guest') throw new DomainError('FORBIDDEN','Usá el acceso de invitado para pedir una canción.',403);
  const scheduledShow=data<ShowDoc>(await this.showRef(input.showId).get());await this.reconcileSchedule(scheduledShow.musicianId);
  await this.cleanupShow(input.showId);
  const requestRef=this.requestRef(randomUUID()),idem=this.db.collection('idempotency').doc(digest(`${actor.id}:reserve:${key}`)),fingerprint=digest(JSON.stringify(input)),guard=this.db.collection('guestHolds').doc(digest(`${actor.id}:${input.showId}`));
  return this.db.runTransaction(async tx=>{
   const saved=await tx.get(idem);
   if (saved.exists) {const previous=data<{fingerprint:string;requestId:string}>(saved);if(previous.fingerprint!==fingerprint)throw new DomainError('IDEMPOTENCY_CONFLICT','Ese intento corresponde a otro pedido.');const r=data<RequestDoc>(await tx.get(this.requestRef(previous.requestId)));own(r,actor);return requestDto(r);}
   const showRef=this.showRef(input.showId),show=data<ShowDoc>(await tx.get(showRef)),p=data<ProfileDoc>(await tx.get(this.profileRef(show.musicianId)));
   const [songSnap,heldSnap]=await Promise.all([tx.get(this.catalog(p).doc(identifier(input.songId))),tx.get(guard)]);
   if(heldSnap.exists){const old=await tx.get(this.requestRef(data<{requestId:string}>(heldSnap).requestId));if(old.exists&&data<RequestDoc>(old).status==='held')throw new DomainError('ACTIVE_HOLD','Ya tenés una reserva pendiente. Revisá Mis pedidos.');}
   if(!p.enabled||p.activeShowId!==show.id||show.status!=='open')throw new DomainError('SHOW_CLOSED','Los pedidos están cerrados por ahora.');
   if(pricingReview(p))throw new DomainError('PRICING_REVIEW_REQUIRED','El músico está actualizando sus precios. Intentá más tarde.');
   const song=data<StoredSong>(songSnap);if(!song.enabled||!show.songIds.includes(song.id))throw new DomainError('SONG_UNAVAILABLE','Esta canción no está disponible.');
   if(show.occupiedCount>=show.capacity)throw new DomainError('CAPACITY_FULL','Se completaron los lugares de esta noche.');
   const dedicationSurcharge=input.type==='dedication'?surcharge(p):0,amount=p.standardPrice+dedicationSurcharge;if(input.expectedPrice!==amount)throw new DomainError('PRICE_CHANGED','El precio cambió. Revisá el nuevo total.');
   const r:RequestDoc={id:requestRef.id,musicianId:p.id,guestId:actor.id,showId:show.id,songId:song.id,songTitle:song.title,artist:song.artist,musicianSlug:p.slug,musicianName:p.stageName,guestName:input.guestName||'Invitado',type:input.type,dedication:input.type==='dedication'?input.dedication!.trim():'',amount,songPrice:p.standardPrice,dedicationSurcharge,status:'held',createdAt:new Date(this.now()).toISOString(),expiresAt:new Date(this.now()+600000).toISOString(),claimedAt:null,confirmedAt:null,receiptUrl:null,queueRank:0,version:1,capacityRetained:true,alias:p.alias,cbu:p.cbu??'',accountName:p.accountName};
   tx.create(requestRef,r);tx.set(guard,{requestId:r.id,guestId:actor.id,showId:show.id});tx.create(idem,{fingerprint,requestId:r.id,guestId:actor.id,createdAt:r.createdAt});tx.update(showRef,{occupiedCount:show.occupiedCount+1,version:show.version+1,songCounts:{...show.songCounts,[song.id]:(show.songCounts[song.id]||0)+1}});this.publicSignal(tx,p.slug,{...show,occupiedCount:show.occupiedCount+1});this.audit(tx,actor,'request.reserved',r.id,p.id);return requestDto(r);
  });
 }
 async claim(actor:Actor,id:string) {
  this.invalidateViews(undefined);
  if(actor.role!=='guest')throw new DomainError('FORBIDDEN','Esta acción corresponde al invitado.',403);
  const pending=data<RequestDoc>(await this.requestRef(id).get());own(pending,actor);await this.reconcileSchedule(pending.musicianId);
  return this.db.runTransaction(async tx=>{const ref=this.requestRef(id),r=data<RequestDoc>(await tx.get(ref));own(r,actor);const showRef=this.showRef(r.showId),show=data<ShowDoc>(await tx.get(showRef));const profile=data<ProfileDoc>(await tx.get(this.profileRef(r.musicianId)));
   if(['queued','playing','played'].includes(r.status))return requestDto(r);
   if(r.status!=='held'||Date.parse(r.expiresAt)<=this.now()||show.status!=='open'||profile.activeShowId!==show.id||this.now()>=Date.parse(show.date)+24*60*60*1000)throw new DomainError('HOLD_EXPIRED','La reserva venció. Si transferiste, hablá con el músico.');
   r.status='queued';r.claimedAt=new Date(this.now()).toISOString();r.queueRank=show.nextQueueRank+1;r.version++;
   tx.set(ref,r);tx.update(showRef,{nextQueueRank:r.queueRank,version:show.version+1});this.audit(tx,actor,'request.claimed',id,r.musicianId);return requestDto(r);
  });
 }
 async cancel(actor:Actor,id:string) {
  this.invalidateViews(undefined);
  return this.db.runTransaction(async tx=>{const ref=this.requestRef(id),r=data<RequestDoc>(await tx.get(ref));own(r,actor);const showRef=this.showRef(r.showId),show=data<ShowDoc>(await tx.get(showRef));if(r.status==='cancelled')return requestDto(r);if(r.status!=='held')throw new DomainError('REVIEW_REQUIRED','Si ya transferiste, coordiná directamente con el músico.');const profile=data<ProfileDoc>(await tx.get(this.profileRef(r.musicianId)));r.status='cancelled';r.capacityRetained=false;r.version++;tx.set(ref,r);tx.update(showRef,{occupiedCount:Math.max(0,show.occupiedCount-1),version:show.version+1,songCounts:{...show.songCounts,[r.songId]:Math.max(0,(show.songCounts[r.songId]||0)-1)}});if(profile.activeShowId===show.id)this.publicSignal(tx,profile.slug,{...show,occupiedCount:Math.max(0,show.occupiedCount-1)});this.audit(tx,actor,'request.cancelled',id,r.musicianId);return requestDto(r);});
 }
 async perform(actor:Actor,id:string,status:'playing'|'played'|'not_performed') {
  this.invalidateViews(actor.musicianId);
  assertMusician(actor);return this.db.runTransaction(async tx=>{const ref=this.requestRef(id),r=data<RequestDoc>(await tx.get(ref));own(r,actor);const showRef=this.showRef(r.showId),show=data<ShowDoc>(await tx.get(showRef));if(r.status===status)return requestDto(r);
   if(status==='playing'&&(r.status!=='queued'||show.status==='finished'))throw new DomainError('INVALID_STATE','Esta canción no está lista para tocar.');if(status==='playing'&&show.playingRequestId)throw new DomainError('ALREADY_PLAYING','Terminá la canción actual antes de empezar otra.');if(status==='played'&&r.status!=='playing')throw new DomainError('INVALID_STATE','Primero iniciá esta canción.');if(status==='not_performed'&&!['queued','playing'].includes(r.status))throw new DomainError('INVALID_STATE','No se puede cambiar este pedido.');r.status=status;r.version++;tx.set(ref,r);tx.update(showRef,{version:show.version+1,playingRequestId:status==='playing'?r.id:show.playingRequestId===r.id?null:show.playingRequestId});this.audit(tx,actor,'request.'+status,id,r.musicianId);return requestDto(r);
  });
 }
 async updateProfile(actor:Actor,input:Partial<ProfileInput>) {
  this.invalidateViews(actor.musicianId);const uid=assertMusician(actor);return this.db.runTransaction(async tx=>{const ref=this.profileRef(uid),p=data<ProfileDoc>(await tx.get(ref),'PROFILE_REQUIRED');version(input.version,p.version);const previousSurcharge=surcharge(p),wasConflict=pricingReview(p),{version:_v,...updates}=input;Object.assign(p,updates);p.cbu??='';delete (p as ProfileDoc&{phone?:string}).phone;if(input.dedicationSurcharge!==undefined||!wasConflict){p.dedicationSurcharge??=previousSurcharge;delete p.dedicationPrice;}if(p.standardPrice+surcharge(p)>100000000)throw new DomainError('INVALID_PRICE','El total supera el máximo permitido.',422);p.version++;tx.set(ref,p);this.publicSignal(tx,p.slug);this.audit(tx,actor,'profile.updated',uid,uid);return profileDto(p);});}
 async saveSong(actor:Actor,input:Partial<SongInput>,id?:string) {
  this.invalidateViews(actor.musicianId);
  const uid=assertMusician(actor);
  return this.db.runTransaction(async tx=>{
   const pr=this.profileRef(uid),p=data<ProfileDoc>(await tx.get(pr),'PROFILE_REQUIRED');
   if(input.folderId&&!p.folders?.some(folder=>folder.id===input.folderId))throw new DomainError('INVALID_FOLDER','Elegí una carpeta de tu repertorio.',422);
   const ref=this.catalog(p).doc(id?identifier(id):randomUUID());
   let song:StoredSong, count=p.songCount;
   if(id){song=data<StoredSong>(await tx.get(ref));Object.assign(song,input);delete (song as StoredSong&{genre?:string}).genre;}
   else {
    count??=(await tx.get(this.catalog(p).limit(2000))).size;
    if(count>=2000)throw new DomainError('CATALOG_TOO_LARGE','El repertorio admite hasta 2000 canciones.',422);
    song={id:ref.id,musicianId:uid,title:input.title!,artist:input.artist!,folderId:input.folderId??null,enabled:input.enabled??true};
    count++;
   }
   tx.set(ref,song);tx.update(pr,{version:p.version+1,...(count===undefined?{}:{songCount:count})});this.publicSignal(tx,p.slug);return songDto(song);
  });
 }
 async importSongs(actor:Actor,rows:SongInput[],folderId:string|null=null) {
  this.invalidateViews(actor.musicianId);
  const uid=assertMusician(actor),p=await this.profile(uid);if(folderId&&!p.folders?.some(folder=>folder.id===folderId))throw new DomainError('INVALID_FOLDER','Elegí una carpeta de tu repertorio.',422);const existing=await this.catalog(p).limit(2001).get(),merged=existing.docs.map(d=>data<StoredSong>(d));
  const known=new Set(merged.map(s=>`${s.title.toLowerCase()}:${s.artist.toLowerCase()}`));let added=0;
  for(const row of rows){const key=`${row.title.toLowerCase()}:${row.artist.toLowerCase()}`;if(known.has(key))continue;merged.push({...row,folderId,id:randomUUID(),musicianId:uid,enabled:row.enabled??true});known.add(key);added++;}
  if(merged.length>2000)throw new DomainError('CATALOG_TOO_LARGE','El repertorio admite hasta 2000 canciones.',422);
  const revision=randomUUID(),target=this.profileRef(uid).collection('catalogs').doc(revision).collection('songs');
  for(let offset=0;offset<merged.length;offset+=400){const batch=this.db.batch();for(const song of merged.slice(offset,offset+400))batch.set(target.doc(song.id),song);await batch.commit();}
  await this.db.runTransaction(async tx=>{const current=data<ProfileDoc>(await tx.get(this.profileRef(uid)));version(p.version,current.version);tx.update(this.profileRef(uid),{catalogVersion:revision,songCount:merged.length,version:current.version+1});this.publicSignal(tx,current.slug);this.audit(tx,actor,'catalog.imported',revision,uid);});return {added};
 }
 async saveFolder(actor:Actor,name:string,id?:string) {
  this.invalidateViews(actor.musicianId);const uid=assertMusician(actor);
  return this.db.runTransaction(async tx=>{const ref=this.profileRef(uid),p=data<ProfileDoc>(await tx.get(ref),'PROFILE_REQUIRED'),folders=[...(p.folders??[])],existing=id?folders.find(folder=>folder.id===id):undefined;if(id&&!existing)throw new DomainError('NOT_FOUND','No encontramos esa carpeta.',404);if(folders.some(folder=>folder.id!==id&&folder.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new DomainError('FOLDER_EXISTS','Ya tenés una carpeta con ese nombre.',409);if(!existing&&folders.length>=100)throw new DomainError('FOLDER_LIMIT','Podés crear hasta 100 carpetas.',422);const folder=existing??{id:randomUUID(),name};folder.name=name;if(!existing)folders.push(folder);tx.update(ref,{folders,version:p.version+1});this.publicSignal(tx,p.slug);this.audit(tx,actor,'folder.saved',folder.id,uid);return folder;});
 }
 async deleteFolder(actor:Actor,id:string) {
  this.invalidateViews(actor.musicianId);const uid=assertMusician(actor),p=await this.profile(uid),folders=p.folders??[];if(!folders.some(folder=>folder.id===id))throw new DomainError('NOT_FOUND','No encontramos esa carpeta.',404);
  const existing=await this.catalog(p).limit(2001).get();if(existing.size>2000)throw new DomainError('CATALOG_TOO_LARGE','El repertorio admite hasta 2000 canciones. Contactanos antes de eliminar esta carpeta.',422);const songs=existing.docs.map(d=>data<StoredSong>(d));
  const revision=randomUUID(),target=this.profileRef(uid).collection('catalogs').doc(revision).collection('songs');
  for(let offset=0;offset<songs.length;offset+=400){const batch=this.db.batch();for(const song of songs.slice(offset,offset+400)){const clean={...song,folderId:song.folderId===id?null:song.folderId??null};delete (clean as StoredSong&{genre?:string}).genre;batch.set(target.doc(song.id),clean);}await batch.commit();}
  await this.db.runTransaction(async tx=>{const current=data<ProfileDoc>(await tx.get(this.profileRef(uid)),'PROFILE_REQUIRED');version(p.version,current.version);tx.update(this.profileRef(uid),{catalogVersion:revision,songCount:songs.length,folders:(current.folders??[]).filter(folder=>folder.id!==id),version:current.version+1});this.publicSignal(tx,current.slug);this.audit(tx,actor,'folder.deleted',id,uid);});return {deleted:true};
 }
 async saveShow(actor:Actor,input:Partial<ShowInput>,id?:string) {
  this.invalidateViews(actor.musicianId);
  const uid=assertMusician(actor),ref=this.showRef(id||randomUUID());return this.db.runTransaction(async tx=>{
   const p=data<ProfileDoc>(await tx.get(this.profileRef(uid)),'PROFILE_REQUIRED');const old=id?data<ShowDoc>(await tx.get(ref)):null;if(old&&old.musicianId!==uid)throw new DomainError('NOT_FOUND','No encontramos ese show.',404);if(old){
    version(input.version,old.version);if(old.status==='finished')throw new DomainError('SHOW_CLOSED','No se puede editar un show finalizado.');
    if(input.capacity!==undefined&&input.capacity<old.capacity){
     if(input.capacity<old.occupiedCount)throw new DomainError('CAPACITY_BELOW_COMMITTED','El cupo no puede ser menor que los pedidos existentes.');
     const played=await tx.get(this.db.collection('requests').where('showId','==',old.id).where('status','==','played').limit(501));
     if(played.size>500)throw new DomainError('CAPACITY_INTEGRITY_ERROR','No pudimos verificar el cupo.',500);
     const minimum=Math.max(1,old.occupiedCount,Math.min(old.capacity,played.size+1));
     if(input.capacity<minimum)throw new DomainError('CAPACITY_TOO_LOW','El cupo debe respetar los pedidos existentes y dejar un lugar sobre las canciones ya cantadas.',422);
    }
   }
   const all=await tx.get(this.catalog(p).limit(2000));const songIds=[...new Set(input.songIds??old?.songIds??all.docs.map(d=>d.id))];if(songIds.some(id=>!all.docs.some(doc=>doc.id===id)))throw new DomainError('INVALID_SONG','El repertorio contiene una canción inválida.',422);
   const {version:_v,...updates}=input;if(updates.date)updates.date=new Date(updates.date).toISOString();const show:ShowDoc=old?{...old,...updates,songIds,version:old.version+1}:{id:ref.id,musicianId:uid,title:input.title!,venue:input.venue!,date:updates.date!,capacity:input.capacity!,songIds,status:'draft',occupiedCount:0,version:1,nextQueueRank:0,playingRequestId:null,songCounts:{}};
   tx.set(ref,show);if(p.activeShowId===show.id)this.publicSignal(tx,p.slug,show);this.audit(tx,actor,'show.saved',show.id,uid);return showDto(show);
  });
 }
 async showAction(actor:Actor,id:string,action:'open'|'pause'|'resume'|'close'|'finish') {
  this.invalidateViews(actor.musicianId);
  const uid=assertMusician(actor),ref=this.showRef(id);const result=await this.db.runTransaction(async tx=>{
   const [ps,ss]=await Promise.all([tx.get(this.profileRef(uid)),tx.get(ref)]);const p=data<ProfileDoc>(ps,'PROFILE_REQUIRED'),s=data<ShowDoc>(ss);if(s.musicianId!==uid)throw new DomainError('NOT_FOUND','No encontramos ese show.',404);
   if(action==='open'||action==='resume'){
    const catalog=await tx.get(this.catalog(p).where('enabled','==',true).limit(2000));
    if(actor.emailVerified!==true)throw new DomainError('EMAIL_NOT_VERIFIED','Verificá tu email antes de abrir el show.',403);
    if(pricingReview(p))throw new DomainError('PRICING_REVIEW_REQUIRED','Revisá el adicional por dedicatoria antes de recibir nuevos pedidos.',422);
    if(!p.alias||!p.accountName||p.standardPrice<100)throw new DomainError('PROFILE_INCOMPLETE','Completá precios y datos de transferencia antes de abrir el show.',422);
    if(!p.enabled||s.status==='finished')throw new DomainError('SHOW_CLOSED','Este show no puede abrirse.');if(p.activeShowId&&p.activeShowId!==id)throw new DomainError('ACTIVE_SHOW_EXISTS','Ya tenés un show activo. Finalizalo antes de abrir otro.');if(!catalog.docs.some(d=>s.songIds.includes(d.id)))throw new DomainError('EMPTY_CATALOG','Agregá canciones antes de abrir el show.');s.status='open';
   } else if(action==='pause'){if(!['open','paused'].includes(s.status))throw new DomainError('INVALID_STATE','Este show no está abierto.');s.status='paused';}
   else if(action==='close'){if(!['open','paused','closed'].includes(s.status))throw new DomainError('INVALID_STATE','Este show no está activo.');s.status='closed';}
   else s.status='finished';
   s.version++;tx.set(ref,s);tx.update(this.profileRef(uid),{activeShowId:s.status==='finished'?(p.activeShowId===id?null:p.activeShowId):id,version:p.version+1});if(s.status==='finished'){if(p.activeShowId===id)this.publicSignal(tx,p.slug,null);}else if(p.activeShowId===id||action==='open'||action==='resume')this.publicSignal(tx,p.slug,s);this.audit(tx,actor,'show.'+action,id,uid);return showDto(s);
  });if(action==='finish'){await this.cleanupShow(id,true);return showDto(data<ShowDoc>(await ref.get()));}return result;
 }
 async reorder(actor:Actor,id:string,requestIds:string[]) {
  this.invalidateViews(actor.musicianId);const uid=assertMusician(actor);return this.db.runTransaction(async tx=>{const ref=this.showRef(id),s=data<ShowDoc>(await tx.get(ref));if(s.musicianId!==uid)throw new DomainError('NOT_FOUND','No encontramos ese show.',404);const queue=await tx.get(this.db.collection('requests').where('showId','==',id).where('status','==','queued').limit(500));if(requestIds.length!==queue.size||new Set(requestIds).size!==queue.size||requestIds.some(id=>!queue.docs.some(d=>d.id===id)))throw new DomainError('QUEUE_CHANGED','La fila cambió. Actualizá antes de reordenar.');const output=requestIds.map((id,index)=>{const doc=queue.docs.find(d=>d.id===id)!,r=data<RequestDoc>(doc);r.queueRank=index+1;r.version++;tx.set(doc.ref,r);return requestDto(r);});tx.update(ref,{version:s.version+1,nextQueueRank:Math.max(s.nextQueueRank,queue.size)});return output;});}
 async attachAsset(actor:Actor,assetId:string,kind:'avatar'|'banner'|'receipt',file:string,requestId?:string) {
  this.invalidateViews(actor.musicianId);
  return this.db.runTransaction(async tx=>{
   const assetRef=this.db.collection('mediaAssets').doc(identifier(assetId));
   if(kind==='receipt'){
    if(actor.role!=='guest'||!requestId)throw new DomainError('FORBIDDEN','No tenés acceso.',403);const ref=this.requestRef(requestId),r=data<RequestDoc>(await tx.get(ref));own(r,actor);const old=r.receiptAssetId;r.receiptAssetId=assetId;r.receiptUrl=`/api/v1/requests/${requestId}/receipt`;r.version++;tx.create(assetRef,{musicianId:r.musicianId,kind,requestId,file});tx.set(ref,r);if(old)tx.delete(this.db.collection('mediaAssets').doc(old));return requestDto(r);
   }
   const uid=assertMusician(actor),ref=this.profileRef(uid),p=data<ProfileDoc>(await tx.get(ref),'PROFILE_REQUIRED'),field=kind==='avatar'?'avatarUrl':'bannerUrl',old=p[field].split('/').pop();p[field]=`/api/v1/public/media/${assetId}`;p.version++;tx.create(assetRef,{musicianId:uid,kind,file});tx.set(ref,p);if(old)tx.delete(this.db.collection('mediaAssets').doc(identifier(old)));return profileDto(p);
  });
 }
 async asset(actor:Actor|null,assetId?:string,requestId?:string):Promise<AssetDoc> {
  if(requestId){if(!actor)throw new DomainError('UNAUTHORIZED','Ingresá para ver el comprobante.',401);const r=data<RequestDoc>(await this.requestRef(requestId).get());own(r,actor);if(!r.receiptAssetId)throw new DomainError('NOT_FOUND','No hay comprobante.',404);const a=data<AssetDoc>(await this.db.collection('mediaAssets').doc(r.receiptAssetId).get());if(a.kind!=='receipt'||a.requestId!==requestId)throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404);return a;}
  const a=data<AssetDoc>(await this.db.collection('mediaAssets').doc(identifier(assetId||'')).get());if(a.kind==='receipt')throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404);const p=await this.profile(a.musicianId);if(![p.avatarUrl,p.bannerUrl].includes(`/api/v1/public/media/${assetId}`))throw new DomainError('NOT_FOUND','No encontramos esa imagen.',404);return a;
 }
 async removeProfileAsset(actor:Actor,kind:'avatar'|'banner') {
  this.invalidateViews(actor.musicianId);const uid=assertMusician(actor);return this.db.runTransaction(async tx=>{const ref=this.profileRef(uid),p=data<ProfileDoc>(await tx.get(ref),'PROFILE_REQUIRED'),field=kind==='avatar'?'avatarUrl':'bannerUrl',old=p[field].split('/').pop();p[field]='';p.version++;tx.set(ref,p);if(old)tx.delete(this.db.collection('mediaAssets').doc(identifier(old)));return profileDto(p);});}
}
