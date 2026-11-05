import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { FieldValue } from 'firebase-admin/firestore';
import { deleteApp,getApps } from 'firebase-admin/app';
import { firebaseAdmin } from './admin.js';
import { FirebaseIdentity } from './identity.js';
import { FirebaseMedia } from './media.js';
import { FirebaseMusicApplication } from './music-application.js';
import { createApp } from '../app.js';
import { firebaseConfig } from './config.js';

const enabled=!!process.env.FIRESTORE_EMULATOR_HOST&&!!process.env.FIREBASE_AUTH_EMULATOR_HOST&&!!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
test('Firebase emulator: real tokens, tenant isolation, transactional cap, good-faith queue and private storage', {skip:!enabled,timeout:120000},async()=>{
 const projectId='demo-musica-non-prod';
 const config={appEnv:'non-prod' as const,mediaProvider:'firebase' as const,projectId,storageBucket:`${projectId}.appspot.com`,allowedOrigins:[],region:'southamerica-west1'};
 const admin=firebaseAdmin(config),service=new FirebaseMusicApplication(admin.db,Date.now,admin.auth),identity=new FirebaseIdentity(admin.auth),media=new FirebaseMedia(admin.bucket!);
 const app=createApp({directory:'/tmp/unused-firebase',firebase:{service,identity,media,appEnv:'non-prod',allowedOrigins:[]}}).app;
 const authUrl=`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
 const signIn=async(email?:string)=>{
  const response=await fetch(`${authUrl}/accounts:${email?'signInWithPassword':'signUp'}?key=emulator-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(email?{email,password:'musica-test-123',returnSecureToken:true}:{returnSecureToken:true})});
  const result=await response.json() as {idToken?:string;error?:unknown};assert.equal(response.status,200,JSON.stringify(result.error));return result.idToken!;
 };
 const auth=(token:string)=>({Authorization:`Bearer ${token}`});
 const setup=async(label:string)=>{
  const slug=`${label}-${randomUUID().slice(0,8)}`,email=`${slug}@example.test`;
  await admin.auth.createUser({email,password:'musica-test-123',emailVerified:true});
  const token=await signIn(email);
  await request(app).get('/api/v1/musician/dashboard').set(auth(token)).expect(404);
  const profile=(await request(app).post('/api/v1/musician/onboard').set(auth(token)).send({stageName:label,slug}).expect(201)).body;
  await request(app).patch('/api/v1/musician/profile').set(auth(token)).send({standardPrice:300000,dedicationSurcharge:150000,alias:'TEST.NO.TRANSFERIR',accountName:'Test account'}).expect(200);
  const song=(await request(app).post('/api/v1/musician/songs').set(auth(token)).send({title:'Same song',artist:'Artist'}).expect(201)).body;
  const show=(await request(app).post('/api/v1/musician/shows').set(auth(token)).send({title:'Test show',venue:'Test venue',date:new Date().toISOString(),capacity:1,songIds:[song.id]}).expect(201)).body;
  await request(app).post(`/api/v1/musician/shows/${show.id}/action`).set(auth(token)).send({action:'open'}).expect(200);
  return {token,profile,song,show,slug};
 };
 try {
  await request(app).post('/api/v1/demo/guest').expect(404);
  await request(app).get('/api/v1/auth/me').set(auth('invalid-token')).expect(401);
  await request(app).get('/api/v1/public/menu').expect(404);
  const [a,b]=await Promise.all([setup('musician-a'),setup('musician-b')]);
  const legacyProfileRef=admin.db.collection('musicians').doc(a.profile.id);
  await legacyProfileRef.update({dedicationSurcharge:FieldValue.delete(),dedicationPrice:450000});
  assert.equal((await request(app).get(`/api/v1/public/qr/${a.slug}`).expect(200)).body.profile.dedicationSurcharge,150000);
  const migrated=(await request(app).patch('/api/v1/musician/profile').set(auth(a.token)).send({bio:'Pricing migrated'}).expect(200)).body;
  assert.equal(migrated.dedicationSurcharge,150000);
  assert.equal((await legacyProfileRef.get()).data()?.dedicationPrice,undefined);
  const dedicationGuest=await signIn();
  const dedicated=(await request(app).post('/api/v1/requests').set(auth(dedicationGuest)).set('Idempotency-Key',randomUUID()).send({showId:b.show.id,songId:b.song.id,type:'dedication',dedication:'For a friend',expectedPrice:450000}).expect(201)).body;
  assert.equal(dedicated.amount,450000);assert.equal(dedicated.songPrice,300000);assert.equal(dedicated.dedicationSurcharge,150000);
  const discountedLegacyRef=admin.db.collection('musicians').doc(b.profile.id);
  await discountedLegacyRef.update({dedicationSurcharge:FieldValue.delete(),dedicationPrice:200000});
  assert.equal((await request(app).get(`/api/v1/public/qr/${b.slug}`).expect(200)).body.profile.pricingReviewRequired,true);
  const blockedGuest=await signIn();
  const blockedDiscount=await request(app).post('/api/v1/requests').set(auth(blockedGuest)).set('Idempotency-Key',randomUUID()).send({showId:b.show.id,songId:b.song.id,type:'dedication',dedication:'For a friend',expectedPrice:200000}).expect(409);
  assert.equal(blockedDiscount.body.error.code,'PRICING_REVIEW_REQUIRED');
  const blockedResume=await request(app).post(`/api/v1/musician/shows/${b.show.id}/action`).set(auth(b.token)).send({action:'resume'}).expect(422);
  assert.equal(blockedResume.body.error.code,'PRICING_REVIEW_REQUIRED');
  const corrected=(await request(app).patch('/api/v1/musician/profile').set(auth(b.token)).send({dedicationSurcharge:100000}).expect(200)).body;
  assert.equal(corrected.pricingReviewRequired,false);
  const folder=(await request(app).post('/api/v1/musician/folders').set(auth(a.token)).send({name:'Acústicas'}).expect(201)).body;
  await request(app).patch(`/api/v1/musician/songs/${b.song.id}`).set(auth(b.token)).send({folderId:folder.id}).expect(422);
  await request(app).patch(`/api/v1/musician/songs/${a.song.id}`).set(auth(a.token)).send({folderId:folder.id}).expect(200);
  const sortedMenu=await request(app).get(`/api/v1/public/qr/${a.slug}`).expect(200);
  assert.deepEqual(sortedMenu.body.folders,[folder]);assert.equal(sortedMenu.body.songs[0].folderId,folder.id);
  await request(app).delete(`/api/v1/musician/folders/${folder.id}`).set(auth(b.token)).expect(404);
  await request(app).delete(`/api/v1/musician/folders/${folder.id}`).set(auth(a.token)).expect(200);
  const unfiledMenu=await request(app).get(`/api/v1/public/qr/${a.slug}`).expect(200);
  assert.deepEqual(unfiledMenu.body.folders,[]);assert.equal(unfiledMenu.body.songs[0].folderId,null);
  const cbu='0000000000000000000000';
  await legacyProfileRef.update({phone:'+541112345678'});
  await request(app).patch('/api/v1/musician/profile').set(auth(a.token)).send({cbu:'123'}).expect(422);
  const bankProfile=(await request(app).patch('/api/v1/musician/profile').set(auth(a.token)).send({cbu}).expect(200)).body;
  assert.equal(bankProfile.cbu,cbu);assert.equal(bankProfile.phone,undefined);
  assert.equal((await legacyProfileRef.get()).data()?.phone,undefined);
  const publicBank=(await request(app).get(`/api/v1/public/qr/${a.slug}`).expect(200)).body.profile;
  assert.equal(publicBank.cbu,undefined);assert.equal(publicBank.phone,undefined);
  const [ga,gb]=await Promise.all([signIn(),signIn()]);
  const reserve=(token:string)=>request(app).post('/api/v1/requests').set(auth(token)).set('Idempotency-Key',randomUUID()).send({showId:a.show.id,songId:a.song.id,type:'standard',expectedPrice:300000});
  const [ra,rb]=await Promise.all([reserve(ga),reserve(gb)]);
  assert.deepEqual([ra.status,rb.status].sort(),[201,409]);
  const winner=ra.status===201?{token:ga,request:ra.body,other:gb}:{token:gb,request:rb.body,other:ga};
  assert.equal(winner.request.cbu,cbu);
  assert.equal(winner.request.musicianSlug,a.slug);
  await request(app).get(`/api/v1/requests/${winner.request.id}`).set(auth(b.token)).expect(404);
  await request(app).get(`/api/v1/requests/${winner.request.id}`).set(auth(winner.other)).expect(404);
  await request(app).patch(`/api/v1/musician/shows/${a.show.id}`).set(auth(b.token)).send({capacity:10}).expect(404);
  const claim=await request(app).post(`/api/v1/requests/${winner.request.id}/claim`).set(auth(winner.token)).expect(200);
  assert.equal(claim.body.status,'queued');assert.equal(claim.body.confirmedAt,null);
  await request(app).patch('/api/v1/musician/profile').set(auth(a.token)).send({cbu:''}).expect(200);
  assert.equal((await request(app).get(`/api/v1/requests/${winner.request.id}`).set(auth(winner.token)).expect(200)).body.cbu,cbu);
  await request(app).patch(`/api/v1/musician/shows/${a.show.id}`).set(auth(a.token)).send({capacity:2}).expect(200);
  const liveCapacity=(await admin.db.collection('publicUpdates').doc(a.slug).get()).data();
  assert.equal(liveCapacity?.showId,a.show.id);assert.equal(liveCapacity?.capacity,2);assert.equal(liveCapacity?.occupiedCount,1);
  await reserve(winner.other).expect(201); // Repeat song allowed; only show cap applies.
  const privatePng=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).png().toBuffer();
  const upload=await request(app).post(`/api/v1/requests/${winner.request.id}/receipt`).set(auth(winner.token)).attach('file',privatePng,'transfer.png').expect(200);
  await request(app).get(upload.body.receiptUrl).set(auth(b.token)).expect(404);
  const receipt=await request(app).get(upload.body.receiptUrl).set(auth(a.token)).expect(200).expect('Content-Type',/image\/webp/);
  assert.equal((await sharp(receipt.body).metadata()).format,'webp');
  const bDashboard=await request(app).get('/api/v1/musician/dashboard').set(auth(b.token)).expect(200);
  assert.equal(bDashboard.body.requests.length,0);assert.equal(bDashboard.body.profile.id,b.profile.id);
  const menu=await request(app).get(`/api/v1/public/qr/${a.slug}`).expect(200);
  assert.equal(menu.body.demo,false);assert.equal(menu.body.profile.alias,undefined);assert.equal(menu.body.remaining,0);
  // Catalog cache is revision-guarded across warm service instances, not stale for its whole TTL.
  let clock=Date.now();const otherInstance=new FirebaseMusicApplication(admin.db,()=>clock);
  const before=await otherInstance.menu(a.slug);assert.equal(before.songs[0]!.title,'Same song');
  await request(app).patch(`/api/v1/musician/songs/${a.song.id}`).set(auth(a.token)).send({title:'Changed song'}).expect(200);
  clock+=6000;
  assert.equal((await otherInstance.menu(a.slug)).songs[0]!.title,'Changed song');
  // Churn must not push retained/accepted history out of the selected-show result.
  for(let offset=0;offset<505;offset+=300){const batch=admin.db.batch();for(let n=offset;n<Math.min(offset+300,505);n++)batch.set(admin.db.collection('requests').doc(randomUUID()),{...winner.request,id:randomUUID(),musicianId:a.profile.id,guestId:'expired-fixture',showId:a.show.id,status:'expired',capacityRetained:false,createdAt:new Date().toISOString()});await batch.commit();}
  await request(app).post(`/api/v1/musician/shows/${a.show.id}/action`).set(auth(a.token)).send({action:'finish'}).expect(200);
  const next=(await request(app).post('/api/v1/musician/shows').set(auth(a.token)).send({title:'Next show',venue:'Next venue',date:new Date().toISOString(),capacity:5,songIds:[a.song.id]}).expect(201)).body;
  await request(app).post(`/api/v1/musician/shows/${next.id}/action`).set(auth(a.token)).send({action:'open'}).expect(200);
  for(let n=0;n<2;n++) {
   const guest=await signIn();
   const held=(await request(app).post('/api/v1/requests').set(auth(guest)).set('Idempotency-Key',randomUUID()).send({showId:next.id,songId:a.song.id,type:'standard',expectedPrice:300000}).expect(201)).body;
   await request(app).post(`/api/v1/requests/${held.id}/claim`).set(auth(guest)).expect(200);
   await request(app).post(`/api/v1/musician/requests/${held.id}/performance`).set(auth(a.token)).send({status:'playing'}).expect(200);
   await request(app).post(`/api/v1/musician/requests/${held.id}/performance`).set(auth(a.token)).send({status:'played'}).expect(200);
  }
  const tooLow=await request(app).patch(`/api/v1/musician/shows/${next.id}`).set(auth(a.token)).send({capacity:2}).expect(422);
  assert.equal(tooLow.body.error.code,'CAPACITY_TOO_LOW');
  await request(app).patch(`/api/v1/musician/shows/${next.id}`).set(auth(a.token)).send({capacity:3}).expect(200);
  const nextSignal=(await admin.db.collection('publicUpdates').doc(a.slug).get()).data();
  assert.equal(nextSignal?.showId,next.id);assert.equal(nextSignal?.capacity,3);assert.equal(nextSignal?.occupiedCount,2);
  await request(app).post(`/api/v1/musician/shows/${a.show.id}/action`).set(auth(a.token)).send({action:'finish'}).expect(200);
  assert.equal((await admin.db.collection('publicUpdates').doc(a.slug).get()).data()?.showId,next.id);
  const historical=await request(app).get(`/api/v1/musician/shows/${a.show.id}/requests`).set(auth(a.token)).expect(200);
  assert.equal(historical.body.length,1);assert.equal(historical.body[0].id,winner.request.id);
  await request(app).get(`/api/v1/musician/shows/${a.show.id}/requests`).set(auth(b.token)).expect(404);
  let scheduleNow=Date.now();
  const scheduledService=new FirebaseMusicApplication(admin.db,()=>scheduleNow,admin.auth);
  const scheduledApp=createApp({directory:'/tmp/unused-firebase-schedule',firebase:{service:scheduledService,identity,media,appEnv:'non-prod',allowedOrigins:[]}}).app;
  const skipped=(await request(app).post('/api/v1/musician/shows').set(auth(a.token)).send({title:'Skipped',venue:'Old venue',date:new Date(scheduleNow+30000).toISOString(),capacity:4,songIds:[a.song.id]}).expect(201)).body;
  const argentinaStart=new Date(scheduleNow+60000-3*60*60000).toISOString().slice(0,19)+'-03:00';
  const planned=(await request(app).post('/api/v1/musician/shows').set(auth(a.token)).send({title:'Tomorrow',venue:'Next venue',date:argentinaStart,capacity:4,songIds:[a.song.id]}).expect(201)).body;
  assert.equal(planned.date,new Date(Math.trunc((scheduleNow+60000)/1000)*1000).toISOString());
  const boundaryGuest=await signIn();
  const pending=(await request(scheduledApp).post('/api/v1/requests').set(auth(boundaryGuest)).set('Idempotency-Key',randomUUID()).send({showId:next.id,songId:a.song.id,type:'standard',expectedPrice:300000}).expect(201)).body;
  const permanentQr=`/api/v1/public/qr/${a.slug}`;
  assert.equal((await request(scheduledApp).get(permanentQr).expect(200)).body.show.id,next.id);
  scheduleNow+=61000;
  await request(scheduledApp).post(`/api/v1/requests/${pending.id}/claim`).set(auth(boundaryGuest)).expect(409);
  assert.equal((await request(scheduledApp).get(`/api/v1/requests/${pending.id}`).set(auth(boundaryGuest)).expect(200)).body.status,'expired');
  const switched=await request(scheduledApp).get(permanentQr).expect(200);
  assert.equal(switched.body.show.id,planned.id);assert.equal(switched.body.show.status,'open');assert.equal(switched.body.show.title,'Tomorrow');
  assert.equal((await admin.db.collection('shows').doc(next.id).get()).data()?.status,'finished');
  await request(scheduledApp).post(`/api/v1/musician/shows/${planned.id}/action`).set(auth(a.token)).send({action:'finish'}).expect(200);
  const afterFinish=await request(scheduledApp).get(permanentQr).expect(200);
  assert.equal(afterFinish.body.show,null);assert.equal((await admin.db.collection('shows').doc(skipped.id).get()).data()?.status,'draft');
  scheduleNow+=86400001;
  const afterWindow=await request(scheduledApp).get(permanentQr).expect(200);
  assert.equal(afterWindow.body.show,null);assert.deepEqual(afterWindow.body.songs,[]);
  // Legacy oversized catalogs must never be truncated by folder deletion.
  const largeFolder=(await request(app).post('/api/v1/musician/folders').set(auth(b.token)).send({name:'Legacy folder'}).expect(201)).body;
  const legacyCatalog=admin.db.collection('musicians').doc(b.profile.id).collection('catalogs').doc('initial').collection('songs');
  for(let offset=0;offset<2000;offset+=400){const batch=admin.db.batch();for(let n=offset;n<offset+400;n++)batch.set(legacyCatalog.doc(`legacy-${n}`),{id:`legacy-${n}`,musicianId:b.profile.id,title:`Legacy ${n}`,artist:'Artist',folderId:largeFolder.id,enabled:true});await batch.commit();}
  await request(app).delete(`/api/v1/musician/folders/${largeFolder.id}`).set(auth(b.token)).expect(422);
  assert.equal((await legacyCatalog.doc('legacy-1999').get()).exists,true);

 } finally {
  const app=getApps().find(a=>a.name===`musica-${projectId}`);if(app)await deleteApp(app);
 }
});

test('production configuration fails closed and only prod/non-prod are accepted',()=>{
 assert.throws(()=>firebaseConfig({APP_ENV:'staging'}),/APP_ENV/);
 assert.throws(()=>firebaseConfig({APP_ENV:'prod'}),/required/);
 assert.throws(()=>firebaseConfig({APP_ENV:'prod',FIREBASE_PROJECT_ID:'valid-project',STORAGE_BUCKET:'valid-project.firebasestorage.app',DEMO_MODE:'true'}),/Production cannot/);
 assert.throws(()=>firebaseConfig({APP_ENV:'prod',FIREBASE_PROJECT_ID:'valid-project',STORAGE_BUCKET:'valid-project.firebasestorage.app',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'}),/Production cannot/);
 assert.equal(firebaseConfig({APP_ENV:'prod',GCLOUD_PROJECT:'valid-project',STORAGE_BUCKET:'valid-project.firebasestorage.app',ALLOWED_ORIGINS:'https://example.com'}).projectId,'valid-project');
 assert.equal(firebaseConfig({APP_ENV:'prod',GCLOUD_PROJECT:'valid-project',MEDIA_PROVIDER:'cloudinary'}).storageBucket,undefined);
});
