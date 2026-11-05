import { createApp } from './app.js';
import { firebaseConfig } from './firebase/config.js';
import { firebaseAdmin } from './firebase/admin.js';
import { FirebaseIdentity } from './firebase/identity.js';
import { CloudinaryMedia } from './cloudinary/media.js';
import { FirebaseMedia } from './firebase/media.js';
import { FirebaseMusicApplication } from './firebase/music-application.js';
export function configuredApp(directory:string) {
 if(process.env.DEMO_MODE==='true') {
  if(process.env.APP_ENV!=='non-prod')throw new Error('Demo mode is allowed only with APP_ENV=non-prod.');
  return createApp({directory,demoMode:true});
 }
 const config=firebaseConfig(),admin=firebaseAdmin(config);
 const media=config.mediaProvider==='cloudinary'?new CloudinaryMedia({cloudName:process.env.CLOUDINARY_CLOUD_NAME||'',apiKey:process.env.CLOUDINARY_API_KEY||'',apiSecret:process.env.CLOUDINARY_API_SECRET||''}):new FirebaseMedia(admin.bucket!);
 return createApp({directory,firebase:{service:new FirebaseMusicApplication(admin.db,Date.now,admin.auth),identity:new FirebaseIdentity(admin.auth),media,appEnv:config.appEnv,allowedOrigins:config.allowedOrigins}});
}
