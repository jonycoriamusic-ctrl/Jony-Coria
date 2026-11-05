import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../app.js';
import { expireHolds,reconcileScheduledShows } from '../domain/model.js';
import { seedState } from '../infrastructure/seed.js';

async function fixture() {
  const temporaryRoot = await mkdtemp(join(tmpdir(),'musica-api-test-'));
  const directory = join(temporaryRoot,'.data');
  let now = Date.now();
  const app = createApp({directory,demoMode:true,now:()=>now}).app;
  const musician = (await request(app).post('/api/v1/demo/login').send({email:'jony@demo.local',password:'musica-demo'}).expect(200)).body.token as string;
  const guest = async () => (await request(app).post('/api/v1/demo/guest').expect(201)).body.token as string;
  const auth = (token: string) => ({Authorization:`Bearer ${token}`});
  const reserve = (token: string, songId='song-1', key: string=crypto.randomUUID(), extra={}) => request(app).post('/api/v1/requests').set(auth(token)).set('Idempotency-Key',key).send({showId:'show-tonight',songId,type:'standard',expectedPrice:300000,...extra});
  return {app,musician,guest,auth,reserve,advance:(ms:number)=>{now+=ms;},close:()=>rm(temporaryRoot,{recursive:true,force:true})};
}

test('last-slot concurrency is serialized and idempotent retries do not duplicate allocation',async () => {
  const f=await fixture(); try {
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:1}).expect(200);
    const [a,b]=await Promise.all([f.guest(),f.guest()]);
    const [first,second]=await Promise.all([f.reserve(a,'song-1','request-a-001'),f.reserve(b,'song-2','request-b-001')]);
    assert.deepEqual([first.status,second.status].sort(),[201,409]);
    const winner=first.status===201 ? {token:a,song:'song-1',key:'request-a-001',result:first} : {token:b,song:'song-2',key:'request-b-001',result:second};
    const retry=await f.reserve(winner.token,winner.song,winner.key).expect(201);
    assert.equal(retry.body.id,winner.result.body.id);
    const dashboard=await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(f.musician)).expect(200);
    assert.equal(dashboard.body.requests.length,1); assert.equal(dashboard.body.shows[0].occupiedCount,1);
    await f.reserve(winner.token,winner.song,winner.key,{guestName:'Changed'}).expect(409);
  } finally { await f.close(); }
});

test('good-faith claim queues immediately without bank verification, retains capacity and guest isolation',async () => {
  const f=await fixture(); try {
    const a=await f.guest(), b=await f.guest(); const held=await f.reserve(a).expect(201);
    await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(b)).expect(404);
    await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(a)).expect(403);
    await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/confirm`).set(f.auth(f.musician)).expect(404);
    const claimed=await request(f.app).post(`/api/v1/requests/${held.body.id}/claim`).set(f.auth(a)).expect(200);
    assert.equal(claimed.body.status,'queued'); assert.ok(claimed.body.claimedAt); assert.equal(claimed.body.queueRank,1); assert.equal(claimed.body.confirmedAt,null);
    f.advance(11*60000);
    const current=await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(a)).expect(200); assert.equal(current.body.status,'queued');
    await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/performance`).set(f.auth(f.musician)).send({status:'played'}).expect(409);
    await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/performance`).set(f.auth(f.musician)).send({status:'playing'}).expect(200);
    await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/performance`).set(f.auth(f.musician)).send({status:'played'}).expect(200);
    const menu=await request(f.app).get('/api/v1/public/menu').expect(200); assert.equal(menu.body.remaining,19);
    assert.equal(menu.body.songs.find((song:any)=>song.id==='song-1').available,true);
    assert.equal(menu.body.profile.alias,undefined); assert.equal(menu.body.requests,undefined);
    assert.equal(current.body.guestId,undefined);
  } finally { await f.close(); }
});

test('expired holds release allocation; stale prices are rejected and old quotes remain immutable',async () => {
  const f=await fixture(); try {
    const guest=await f.guest(); const held=await f.reserve(guest).expect(201);
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({standardPrice:500000,alias:'NEW.DEMO.ALIAS'}).expect(200);
    const old=await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(guest)).expect(200); assert.equal(old.body.amount,300000); assert.equal(old.body.alias,'DEMO.NO.TRANSFERIR');
    f.advance(10*60000+1);
    const expired=await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(guest)).expect(200); assert.equal(expired.body.status,'expired');
    await request(f.app).post(`/api/v1/requests/${held.body.id}/claim`).set(f.auth(guest)).expect(409);
    await f.reserve(guest).expect(409);
    await f.reserve(guest,'song-1',crypto.randomUUID(),{expectedPrice:500000}).expect(201);
  } finally { await f.close(); }
});

test('dedication price is an add-on and each request keeps its quoted breakdown',async()=>{
  const f=await fixture();try{
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({standardPrice:1000,dedicationSurcharge:500}).expect(200);
    const menu=(await request(f.app).get('/api/v1/public/qr/jony').expect(200)).body;
    assert.equal(menu.profile.standardPrice,1000);assert.equal(menu.profile.dedicationSurcharge,500);assert.equal(menu.profile.dedicationPrice,undefined);
    const guest=await f.guest();
    await request(f.app).post('/api/v1/requests').set(f.auth(guest)).set('Idempotency-Key',crypto.randomUUID()).send({showId:'show-tonight',songId:'song-1',type:'dedication',dedication:'Para Ana',expectedPrice:1000}).expect(409);
    const quoted=(await request(f.app).post('/api/v1/requests').set(f.auth(guest)).set('Idempotency-Key',crypto.randomUUID()).send({showId:'show-tonight',songId:'song-1',type:'dedication',dedication:'Para Ana',expectedPrice:1500}).expect(201)).body;
    assert.equal(quoted.amount,1500);assert.equal(quoted.songPrice,1000);assert.equal(quoted.dedicationSurcharge,500);
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({standardPrice:2000,dedicationSurcharge:800}).expect(200);
    const saved=(await request(f.app).get(`/api/v1/requests/${quoted.id}`).set(f.auth(guest)).expect(200)).body;
    assert.equal(saved.amount,1500);assert.equal(saved.songPrice,1000);assert.equal(saved.dedicationSurcharge,500);
  }finally{await f.close();}
});

test('CBU is private, validated and snapshotted; public phone is removed',async()=>{
  const f=await fixture();try{
    const cbu='0000000000000000000000';
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({cbu:'123'}).expect(422);
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({phone:'+541112345678'}).expect(422);
    const saved=(await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({cbu}).expect(200)).body;
    assert.equal(saved.cbu,cbu);assert.equal(saved.phone,undefined);
    const publicMenu=(await request(f.app).get('/api/v1/public/menu').expect(200)).body;
    assert.equal(publicMenu.profile.cbu,undefined);assert.equal(publicMenu.profile.phone,undefined);
    const guest=await f.guest(),held=(await f.reserve(guest).expect(201)).body;
    assert.equal(held.cbu,cbu);
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({cbu:''}).expect(200);
    assert.equal((await request(f.app).get(`/api/v1/requests/${held.id}`).set(f.auth(guest)).expect(200)).body.cbu,cbu);
  }finally{await f.close();}
});

test('legacy total price migrates to an add-on without changing the displayed total',()=>{
  const state=seedState();const profile=state.profiles[0] as typeof state.profiles[number]&{dedicationPrice?:number};
  delete (profile as Partial<typeof profile>).dedicationSurcharge;profile.dedicationPrice=450000;
  expireHolds(state,Date.now());
  assert.equal(profile.dedicationSurcharge,150000);assert.equal(profile.dedicationPrice,undefined);
});

test('a legacy dedication discount requires musician review instead of silently raising its price',async()=>{
  const root=await mkdtemp(join(tmpdir(),'musica-legacy-pricing-'));try{
    const state=seedState();const profile=state.profiles[0] as typeof state.profiles[number]&{dedicationPrice?:number};
    delete (profile as Partial<typeof profile>).dedicationSurcharge;profile.dedicationPrice=200000;
    const directory=join(root,'.data');await mkdir(directory);
    await writeFile(join(directory,'demo.json'),JSON.stringify(state));
    const app=createApp({directory,demoMode:true}).app;
    const musician=(await request(app).post('/api/v1/demo/login').send({email:'jony@demo.local',password:'musica-demo'}).expect(200)).body.token;
    const guest=(await request(app).post('/api/v1/demo/guest').expect(201)).body.token;
    const menu=(await request(app).get('/api/v1/public/qr/jony').expect(200)).body;
    assert.equal(menu.profile.pricingReviewRequired,true);assert.equal(menu.profile.dedicationSurcharge,0);
    const blocked=await request(app).post('/api/v1/requests').set('Authorization',`Bearer ${guest}`).set('Idempotency-Key',crypto.randomUUID()).send({showId:'show-tonight',songId:'song-1',type:'dedication',dedication:'Para Ana',expectedPrice:200000}).expect(409);
    assert.equal(blocked.body.error.code,'PRICING_REVIEW_REQUIRED');
    await request(app).patch('/api/v1/musician/profile').set('Authorization',`Bearer ${musician}`).send({dedicationSurcharge:100000}).expect(200);
    assert.equal((await request(app).get('/api/v1/public/qr/jony').expect(200)).body.profile.pricingReviewRequired,false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('only one active show across venues; cap changes cannot erase allocations',async () => {
  const f=await fixture(); try {
    await f.reserve(await f.guest()).expect(201);
    const stableQr='/api/v1/public/qr/jony';
    const firstMenu=await request(f.app).get(stableQr).expect(200);
    assert.equal(firstMenu.body.show.id,'show-tonight');assert.ok(firstMenu.body.songs.some((song:{id:string})=>song.id==='song-1'));
    const another=await request(f.app).post('/api/v1/musician/shows').set(f.auth(f.musician)).send({title:'Otra noche',venue:'Otro bar',date:new Date(Date.now()+86400000).toISOString(),capacity:10,songIds:['song-2']}).expect(201);
    await request(f.app).post(`/api/v1/musician/shows/${another.body.id}/action`).set(f.auth(f.musician)).send({action:'open'}).expect(409);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:0}).expect(422);
    await request(f.app).post('/api/v1/musician/shows/show-tonight/action').set(f.auth(f.musician)).send({action:'finish'}).expect(200);
    const between=await request(f.app).get(stableQr).expect(200);assert.equal(between.body.show,null);assert.deepEqual(between.body.songs,[]);
    await request(f.app).post(`/api/v1/musician/shows/${another.body.id}/action`).set(f.auth(f.musician)).send({action:'open'}).expect(200);
    const menu=await request(f.app).get(stableQr).expect(200);assert.equal(menu.body.show.id,another.body.id);assert.equal(menu.body.show.title,'Otra noche');assert.deepEqual(menu.body.songs.map((song:{id:string})=>song.id),['song-2']);
  } finally { await f.close(); }
});

test('seven played songs in an eight-song show keep one contingency slot',async () => {
  const f=await fixture();try {
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:8}).expect(200);
    for(let index=0;index<7;index++) {
      const guest=await f.guest();
      const held=await f.reserve(guest).expect(201);
      await request(f.app).post(`/api/v1/requests/${held.body.id}/claim`).set(f.auth(guest)).expect(200);
      await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/performance`).set(f.auth(f.musician)).send({status:'playing'}).expect(200);
      await request(f.app).post(`/api/v1/musician/requests/${held.body.id}/performance`).set(f.auth(f.musician)).send({status:'played'}).expect(200);
    }
    const refused=await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:7}).expect(422);
    assert.equal(refused.body.error.code,'CAPACITY_TOO_LOW');
    const menu=(await request(f.app).get('/api/v1/public/menu').expect(200)).body;
    assert.equal(menu.show.capacity,8);assert.equal(menu.remaining,1);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:9}).expect(200);
    const expanded=(await request(f.app).get('/api/v1/public/menu').expect(200)).body;
    assert.equal(expanded.show.capacity,9);assert.equal(expanded.remaining,2);
  }finally{await f.close();}
});

test('the same musician QR switches scheduled shows automatically and preserves old request history',async () => {
  const f=await fixture();try {
    const guest=await f.guest(),held=await f.reserve(guest).expect(201);
    const next=await request(f.app).post('/api/v1/musician/shows').set(f.auth(f.musician)).send({title:'Mañana',venue:'Bar B',date:new Date(Date.now()+60000).toISOString(),capacity:5,songIds:['song-2']}).expect(201);
    const qr='/api/v1/public/qr/jony';
    assert.equal((await request(f.app).get(qr).expect(200)).body.show.id,'show-tonight');
    f.advance(61000);
    const switched=await request(f.app).get(qr).expect(200);
    assert.equal(switched.body.show.id,next.body.id);assert.equal(switched.body.show.status,'open');assert.deepEqual(switched.body.songs.map((song:{id:string})=>song.id),['song-2']);
    const dashboard=await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(f.musician)).expect(200);
    assert.equal(dashboard.body.shows.find((show:{id:string})=>show.id==='show-tonight').status,'finished');
    assert.equal((await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(guest)).expect(200)).body.status,'expired');
    await f.reserve(guest,'song-1').expect(409);
    const newRequest=await request(f.app).post('/api/v1/requests').set(f.auth(guest)).set('Idempotency-Key',crypto.randomUUID()).send({showId:next.body.id,songId:'song-2',type:'standard',expectedPrice:300000}).expect(201);
    assert.equal(newRequest.body.showId,next.body.id);
    f.advance(86400001);
    const ended=await request(f.app).get(qr).expect(200);assert.equal(ended.body.show,null);assert.deepEqual(ended.body.songs,[]);
  }finally{await f.close();}
});

test('a finished later show never reopens an earlier skipped draft',()=>{
  const state=seedState();const start=Date.now();state.shows[0]!.status='finished';state.shows[0]!.date=new Date(start-2*60*60000).toISOString();
  state.shows.push({...state.shows[0]!,id:'skipped',status:'draft',date:new Date(start-90*60000).toISOString(),version:1});
  state.shows.push({...state.shows[0]!,id:'winner',status:'draft',date:new Date(start-30*60000).toISOString(),version:1});
  reconcileScheduledShows(state,start);
  assert.equal(state.shows.find(show=>show.id==='winner')?.status,'open');
  state.shows.find(show=>show.id==='winner')!.status='finished';
  reconcileScheduledShows(state,start+60000);
  assert.equal(state.shows.find(show=>show.id==='skipped')?.status,'draft');
  assert.equal(state.shows.some(show=>show.status==='open'),false);
});

test('a transfer claim cannot queue an old show across the schedule boundary without a QR refresh',async()=>{
  const f=await fixture();try{
    const guest=await f.guest(),held=await f.reserve(guest).expect(201);
    await request(f.app).post('/api/v1/musician/shows').set(f.auth(f.musician)).send({title:'Next',venue:'Second bar',date:new Date(Date.now()+60000).toISOString(),capacity:5,songIds:['song-2']}).expect(201);
    f.advance(61000);
    await request(f.app).post(`/api/v1/requests/${held.body.id}/claim`).set(f.auth(guest)).expect(409);
    assert.equal((await request(f.app).get(`/api/v1/requests/${held.body.id}`).set(f.auth(guest)).expect(200)).body.status,'expired');
  }finally{await f.close();}
});

test('receipt image is private and never confirms funds; invalid images and unsafe profile links rejected',async () => {
  const f=await fixture(); try {
    const a=await f.guest(),b=await f.guest(); const held=await f.reserve(a).expect(201);
    const image=await sharp({create:{width:16,height:16,channels:3,background:'#ffffff'}}).png().toBuffer();
    const attached=await request(f.app).post(`/api/v1/requests/${held.body.id}/receipt`).set(f.auth(a)).attach('file',image,'receipt.png').expect(200);
    assert.equal(attached.body.status,'held'); assert.equal(attached.body.confirmedAt,null);
    await request(f.app).get(attached.body.receiptUrl).expect(401);
    await request(f.app).get(attached.body.receiptUrl).set(f.auth(b)).expect(404);
    const receipt=await request(f.app).get(attached.body.receiptUrl).set(f.auth(f.musician)).expect(200).expect('Content-Type',/image\/webp/);
    assert.equal((await sharp(receipt.body).metadata()).format,'webp');
    assert.equal(receipt.headers['cache-control'],'private, no-store');
    await request(f.app).post(`/api/v1/requests/${held.body.id}/receipt`).set(f.auth(a)).attach('file',Buffer.from('<svg onload="alert(1)"></svg>'),'receipt.png').expect(422);
    await request(f.app).patch('/api/v1/musician/profile').set(f.auth(f.musician)).send({website:'javascript:alert(1)'}).expect(422);
    const avatar=await request(f.app).post('/api/v1/musician/profile/media').set(f.auth(f.musician)).field('kind','avatar').attach('file',image,'avatar.png').expect(200);
    const publicImage=await request(f.app).get(avatar.body.avatarUrl).expect(200).expect('Content-Type',/image\/webp/);
    assert.equal((await sharp(publicImage.body).metadata()).width,16);
    await request(f.app).delete('/api/v1/musician/profile/media/avatar').set(f.auth(f.musician)).expect(200);
    await request(f.app).get(avatar.body.avatarUrl).expect(404);
  } finally { await f.close(); }
});

test('CSV validates the whole upload before mutation and supports quoted titles',async () => {
  const f=await fixture(); try {
    const csv='title,artist,genre\n"Una canción, otra",Artista,Pop\nSegunda,Autor,Rock';
    const preview=await request(f.app).post('/api/v1/musician/songs/import/preview').set(f.auth(f.musician)).send({csv}).expect(200); assert.equal(preview.body.count,2); assert.equal(preview.body.rows[0].folderId,null); assert.equal(preview.body.rows[0].genre,undefined);
    const imported=await request(f.app).post('/api/v1/musician/songs/import').set(f.auth(f.musician)).send({csv}).expect(200); assert.equal(imported.body.added,2);
    await request(f.app).post('/api/v1/musician/songs/import').set(f.auth(f.musician)).send({csv:'title,artist\nValid,Artist\n,Missing'}).expect(422);
    const dashboard=await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(f.musician)).expect(200); assert.equal(dashboard.body.songs.length,18);
  } finally { await f.close(); }
});

test('musician folders define public menu filters and deleting one keeps its songs',async () => {
  const f=await fixture(); try {
    const initial=await request(f.app).get('/api/v1/public/menu').expect(200);
    assert.deepEqual(initial.body.folders,[]);
    assert.ok(initial.body.songs.every((song:{folderId:string|null;genre?:string})=>song.folderId===null&&song.genre===undefined));
    const folder=(await request(f.app).post('/api/v1/musician/folders').set(f.auth(f.musician)).send({name:'Para bailar'}).expect(201)).body;
    await request(f.app).post('/api/v1/musician/folders').set(f.auth(f.musician)).send({name:'para bailar'}).expect(409);
    await request(f.app).patch('/api/v1/musician/songs/song-1').set(f.auth(f.musician)).send({folderId:folder.id}).expect(200);
    await request(f.app).patch('/api/v1/musician/songs/song-2').set(f.auth(f.musician)).send({folderId:'foreign-folder'}).expect(422);
    const csv='title,artist\nNueva,Artista';
    await request(f.app).post('/api/v1/musician/songs/import').set(f.auth(f.musician)).send({csv,folderId:folder.id}).expect(200);
    const menu=await request(f.app).get('/api/v1/public/menu').expect(200);
    assert.deepEqual(menu.body.folders,[folder]);
    assert.equal(menu.body.songs.find((song:{id:string})=>song.id==='song-1').folderId,folder.id);
    const dashboard=await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(f.musician)).expect(200);
    assert.equal(dashboard.body.songs.find((song:{title:string})=>song.title==='Nueva').folderId,folder.id);
    const renamed=(await request(f.app).patch(`/api/v1/musician/folders/${folder.id}`).set(f.auth(f.musician)).send({name:'Para cantar'}).expect(200)).body;
    assert.equal(renamed.id,folder.id);
    await request(f.app).delete(`/api/v1/musician/folders/${folder.id}`).set(f.auth(f.musician)).expect(200);
    const after=await request(f.app).get('/api/v1/public/menu').expect(200);
    assert.deepEqual(after.body.folders,[]);
    assert.equal(after.body.songs.find((song:{id:string})=>song.id==='song-1').folderId,null);
    const afterDashboard=await request(f.app).get('/api/v1/musician/dashboard').set(f.auth(f.musician)).expect(200);
    assert.equal(afterDashboard.body.songs.find((song:{title:string})=>song.title==='Nueva').folderId,null);
  } finally { await f.close(); }
});

test('demo mode refuses startup when not explicitly enabled',() => {
  assert.throws(()=>createApp({directory:'/tmp/unused-musica-demo',demoMode:false}),/Local demo requires/);
});

test('claims do not pause intake and retries preserve rank; held requests cannot enter queue via reorder',async () => {
  const f=await fixture(); try {
    const a=await f.guest(),b=await f.guest();
    const first=await f.reserve(a,'song-1').expect(201),second=await f.reserve(b,'song-2').expect(201);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:1}).expect(409);
    await request(f.app).post(`/api/v1/requests/${first.body.id}/claim`).set(f.auth(a)).expect(200);
    f.advance(16*60000);
    const menu=await request(f.app).get('/api/v1/public/menu').expect(200); assert.equal(menu.body.show.status,'open'); assert.equal(menu.body.show.occupiedCount,1);
    await request(f.app).post('/api/v1/musician/shows/show-tonight/action').set(f.auth(f.musician)).send({action:'resume'}).expect(200);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight/queue').set(f.auth(f.musician)).send({requestIds:[first.body.id,second.body.id]}).expect(409);
    const ordered=await request(f.app).patch('/api/v1/musician/shows/show-tonight/queue').set(f.auth(f.musician)).send({requestIds:[first.body.id]}).expect(200);
    const retries=await Promise.all([1,2].map(()=>request(f.app).post(`/api/v1/requests/${first.body.id}/claim`).set(f.auth(a)).expect(200)));
    for (const retry of retries) { assert.equal(retry.body.status,'queued'); assert.equal(retry.body.queueRank,ordered.body[0].queueRank); assert.equal(retry.body.confirmedAt,null); }
    await f.reserve(b,'song-3').expect(201);
  } finally { await f.close(); }
});

test('local state and guest ownership survive API restart',async () => {
  const directory=await mkdtemp(join(tmpdir(),'musica-persist-test-'));
  try {
    const first=createApp({directory,demoMode:true}).app;
    const token=(await request(first).post('/api/v1/demo/guest').expect(201)).body.token;
    const held=await request(first).post('/api/v1/requests').set('Authorization',`Bearer ${token}`).set('Idempotency-Key','restart-request-001').send({showId:'show-tonight',songId:'song-3',type:'dedication',dedication:'Para mi familia',expectedPrice:450000}).expect(201);
    const restarted=createApp({directory,demoMode:true}).app;
    const result=await request(restarted).get(`/api/v1/requests/${held.body.id}`).set('Authorization',`Bearer ${token}`).expect(200);
    assert.equal(result.body.dedication,'Para mi familia'); assert.equal(result.body.amount,450000);
  } finally { await rm(directory,{recursive:true,force:true}); }
});


test('legacy review claims migrate once, preserve capacity and never invent verified payments', () => {
  const state=seedState();
  const base={musicianId:'jony',guestId:'guest',showId:'show-tonight',songId:'song-1',songTitle:'Test',artist:'Test',guestName:'Guest',type:'standard' as const,dedication:'',amount:300000,createdAt:'2026-11-05T01:00:00.000Z',expiresAt:'2026-11-05T01:10:00.000Z',confirmedAt:null,receiptUrl:null,version:1,capacityRetained:true,alias:'DEMO',accountName:'DEMO'};
  state.requests=[{...base,id:'already-queued',status:'queued',queueRank:4,claimedAt:'2026-11-05T01:01:00.000Z'}, {...base,id:'later',status:'review_pending',queueRank:0,claimedAt:'2026-11-05T01:03:00.000Z'}, {...base,id:'earlier',status:'review_pending',queueRank:0,claimedAt:'2026-11-05T01:02:00.000Z'}];
  expireHolds(state,Date.parse('2026-11-05T02:00:00.000Z'));
  assert.deepEqual(state.requests.map(r=>r.queueRank),[4,6,5]);
  assert.ok(state.requests.every(r=>r.status==='queued'&&r.confirmedAt===null));
  assert.equal(state.shows[0].occupiedCount,3); assert.equal(state.shows[0].status,'open');
  const snapshot=JSON.stringify(state);
  expireHolds(state,Date.parse('2026-11-05T03:00:00.000Z'));
  assert.equal(JSON.stringify(state),snapshot);
  state.shows[0].status='finished';
  state.requests.push({...base,id:'finished-claim',status:'review_pending',queueRank:0,claimedAt:'2026-11-05T01:04:00.000Z'});
  expireHolds(state,Date.parse('2026-11-05T04:00:00.000Z'));
  assert.equal(state.requests.at(-1)!.status,'not_performed');
  assert.equal(state.requests.at(-1)!.confirmedAt,null);
  assert.equal(state.shows[0].occupiedCount,4);
});


test('songs can repeat freely while live capacity edits enforce allocations and versions', async () => {
  const f=await fixture(); try {
    const a=await f.guest(),b=await f.guest(),c=await f.guest();
    const first=await f.reserve(a,'song-1').expect(201);
    await request(f.app).post(`/api/v1/requests/${first.body.id}/claim`).set(f.auth(a)).expect(200);
    await f.reserve(b,'song-1').expect(201);
    let menu=(await request(f.app).get('/api/v1/public/menu').expect(200)).body;
    assert.equal(menu.songs.find((s:any)=>s.id==='song-1').available,true);
    assert.equal(menu.profile.repeatLimit,undefined);
    const cap=await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:2,version:menu.show.version}).expect(200);
    await f.reserve(c,'song-1').expect(409);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:1,version:cap.body.version}).expect(409);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:3,version:menu.show.version}).expect(409);
    await request(f.app).patch('/api/v1/musician/shows/show-tonight').set(f.auth(f.musician)).send({capacity:3,version:cap.body.version}).expect(200);
    await f.reserve(c,'song-1').expect(201);
    menu=(await request(f.app).get('/api/v1/public/menu').expect(200)).body;
    assert.equal(menu.remaining,0); assert.equal(menu.songs.find((s:any)=>s.id==='song-1').available,false);
  } finally { await f.close(); }
});

test('Functions-style consumed multipart rawBody still uploads and serves private/public images',async()=>{
 const f=await fixture();try{
  const {default:express}=await import('express');
  const wrapper=express();
  wrapper.use(express.raw({type:'multipart/form-data',limit:'9mb'}));
  wrapper.use((req,_res,next)=>{if(Buffer.isBuffer(req.body))(req as typeof req&{rawBody:Buffer}).rawBody=req.body;next();});
  wrapper.use(f.app);
  const guest=await f.guest(),held=await f.reserve(guest,'song-4').expect(201);
  const image=await sharp({create:{width:12,height:8,channels:3,background:'#fff'}}).png().toBuffer();
  const receipt=await request(wrapper).post(`/api/v1/requests/${held.body.id}/receipt`).set(f.auth(guest)).attach('file',image,'transfer.png').expect(200);
  const rendered=await request(wrapper).get(receipt.body.receiptUrl).set(f.auth(f.musician)).expect(200).expect('Content-Type',/image\/webp/);
  assert.equal((await sharp(rendered.body).metadata()).width,12);
  const profile=await request(wrapper).post('/api/v1/musician/profile/media').set(f.auth(f.musician)).field('kind','banner').attach('file',image,'banner.png').expect(200);
  await request(wrapper).get(profile.body.bannerUrl).expect(200).expect('Content-Type',/image\/webp/);
 }finally{await f.close();}
});

test('selected historical show endpoint retains accepted requests and isolates shows',async()=>{
 const f=await fixture();try{
  const guest=await f.guest(),held=await f.reserve(guest,'song-5').expect(201);
  await request(f.app).post(`/api/v1/requests/${held.body.id}/claim`).set(f.auth(guest)).expect(200);
  await request(f.app).post('/api/v1/musician/shows/show-tonight/action').set(f.auth(f.musician)).send({action:'finish'}).expect(200);
  const next=await request(f.app).post('/api/v1/musician/shows').set(f.auth(f.musician)).send({title:'Next night',venue:'Next bar',date:new Date(Date.now()+86400000).toISOString(),capacity:5}).expect(201);
  await request(f.app).post(`/api/v1/musician/shows/${next.body.id}/action`).set(f.auth(f.musician)).send({action:'open'}).expect(200);
  const history=await request(f.app).get('/api/v1/musician/shows/show-tonight/requests').set(f.auth(f.musician)).expect(200);
  assert.equal(history.body.length,1);assert.equal(history.body[0].id,held.body.id);
  await request(f.app).get('/api/v1/musician/shows/show-tonight/requests').set(f.auth(guest)).expect(403);
 }finally{await f.close();}
});
