import { onRequest } from 'firebase-functions/v2/https';
import { configuredApp } from './configured-app.js';
import type { Express } from 'express';
let application:Express|undefined;
export const api=onRequest({region:process.env.FUNCTIONS_REGION||'us-central1',memory:'512MiB',secrets:process.env.MEDIA_PROVIDER==='cloudinary'?['CLOUDINARY_API_SECRET']:[],timeoutSeconds:60,maxInstances:5,minInstances:0},(req,res)=>{
 try {
  if(process.env.DEMO_MODE==='true')throw new Error('Demo mode cannot run as a deployed function.');
  application??=configuredApp('/tmp/musica-unused').app;
  application(req,res);
 } catch {
  res.status(503).json({error:{code:'CONFIGURATION_REQUIRED',message:'El servicio todavía no está configurado.'}});
 }
});
