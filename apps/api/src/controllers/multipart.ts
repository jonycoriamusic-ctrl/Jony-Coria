import { Readable } from 'node:stream';
import multer from 'multer';
import type { Request,Response,NextFunction } from 'express';
import { DomainError } from '../domain/model.js';
const maximumImageBytes=4*1024*1024;
const parse=multer({storage:multer.memoryStorage(),limits:{fileSize:maximumImageBytes,files:1,fields:2,fieldSize:1024,parts:3}}).single('file');
/** Functions consumes the HTTP stream before Express; replay its bounded rawBody. */
export function imageMultipart(req:Request,res:Response,next:NextFunction) {
 const raw=(req as Request&{rawBody?:Buffer}).rawBody;
 if(!raw || !req.is('multipart/form-data')) return parse(req,res,next);
 if(!Buffer.isBuffer(raw)||raw.length>maximumImageBytes+65536)return next(new DomainError('IMAGE_TOO_LARGE','La imagen supera el tamaño permitido.',422));
 const replay=Object.assign(Readable.from(raw),{headers:req.headers,method:req.method,url:req.url}) as unknown as Request;
 parse(replay,res,error=>{if(error)return next(error);req.body=replay.body;req.file=replay.file;next();});
}
