import {Router} from 'express';
import {openapi} from '../openapi.js';
import {readFileSync} from 'node:fs';
import {pool} from '../db/pool.js';
import {redis} from '../db/redis.js';
import {config} from '../config.js';
import {requireAuth,requireAdmin,authRateLimit,issueCsrf,sessionCookie,csrfCookie,cookieOptions} from '../middleware/security.js';
import {login,logout,forgotPassword,resetPassword} from '../services/authService.js';
import {listShows,createShow,updateShow,deleteShow} from '../services/showService.js';
import {subscribe,confirmSubscription,unsubscribe} from '../services/newsletterService.js';
import {publishEvent} from '../services/syncService.js';
import {showInput,showUpdate,emailInput,loginInput,resetInput,preferencesInput,idInput,versionInput,keyInput} from '../types/schemas.js';
import type {Preferences,User} from '../types/domain.js';
import {AppError} from '../utils/AppError.js';

function buildId(){try{return readFileSync(new URL('../../BUILD_ID',import.meta.url),'utf8').trim();}catch{return 'development';}}
export const routes=Router();
routes.get('/openapi.json',(_req,res)=>res.json(openapi));
routes.get('/health',async(_req,res)=>{await Promise.all([pool.query('SELECT 1'),redis.ping()]);res.json({status:'ok',buildId:buildId()});});
routes.get('/version',(_req,res)=>res.json({buildId:buildId()}));
routes.get('/auth/csrf',(_req,res)=>res.json({token:issueCsrf(res)}));
routes.post('/auth/login',authRateLimit,async(req,res)=>{const input=loginInput.parse(req.body);const result=await login(input.email,input.password);res.cookie(sessionCookie,result.token,{...cookieOptions,maxAge:config.sessionAbsoluteHours*3600000});res.json({user:result.user});});
routes.get('/auth/me',requireAuth,(req,res)=>{const {id,email,role}=req.user!;res.json({user:{id,email,role}});});
routes.post('/auth/logout',requireAuth,async(req,res)=>{await logout(req.user!);res.clearCookie(sessionCookie,cookieOptions);res.clearCookie(csrfCookie,cookieOptions);res.sendStatus(204);});
routes.post('/auth/forgot-password',authRateLimit,async(req,res)=>{await forgotPassword(emailInput.parse(req.body).email);res.json({message:'If that account exists, a reset link has been sent'});});
routes.post('/auth/reset-password',authRateLimit,async(req,res)=>{const i=resetInput.parse(req.body);await resetPassword(i.token,i.password);res.sendStatus(204);});
routes.get('/shows',async(req,res)=>{res.json(await listShows(typeof req.query.cursor==='string'?req.query.cursor:undefined));});
routes.get('/admin/shows',requireAuth,async(req,res)=>res.json(await listShows(typeof req.query.cursor==='string'?req.query.cursor:undefined,true)));
routes.post('/shows',requireAuth,async(req,res)=>res.status(201).json(await createShow(showInput.parse(req.body),req.user!.id,keyInput.parse(req.get('Idempotency-Key')))));
routes.patch('/shows/:id',requireAuth,async(req,res)=>res.json(await updateShow(idInput.parse(req.params.id),showUpdate.parse(req.body),req.user!.id,keyInput.parse(req.get('Idempotency-Key')))));
routes.delete('/shows/:id',requireAuth,async(req,res)=>res.json(await deleteShow(idInput.parse(req.params.id),versionInput.parse(req.query.version),req.user!.id,keyInput.parse(req.get('Idempotency-Key')))));
routes.get('/preferences',requireAuth,async(req,res)=>{const row=(await pool.query<Preferences>('SELECT theme,locale FROM preferences WHERE user_id=$1',[req.user!.id])).rows[0];res.json(row??{theme:'dark',locale:'pt-BR'});});
routes.patch('/preferences',requireAuth,async(req,res)=>{const input=preferencesInput.parse(req.body);await pool.query('INSERT INTO preferences(user_id,theme,locale) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET theme=$2,locale=$3',[req.user!.id,input.theme,input.locale]);publishEvent({entityType:'preferences',eventType:'updated',entityId:req.user!.id,userId:req.user!.id});res.json(input);});
routes.post('/newsletter',authRateLimit,async(req,res)=>{await subscribe(emailInput.parse(req.body).email);res.json({message:'Check your email to confirm the subscription'});});
routes.get('/newsletter/confirm',async(req,res)=>{await confirmSubscription(resetInput.shape.token.parse(req.query.token));res.json({message:'Subscription confirmed'});});
routes.post('/newsletter/unsubscribe',async(req,res)=>{await unsubscribe(resetInput.shape.token.parse(req.body.token));res.sendStatus(204);});
routes.get('/account/export',requireAuth,async(req,res)=>{const {id,email,role}=req.user!;const preferences=(await pool.query('SELECT theme,locale FROM preferences WHERE user_id=$1',[id])).rows[0];res.json({user:{id,email,role},preferences:preferences??null});});
routes.delete('/account',requireAuth,async(req,res)=>{
 const user=req.user!;const client=await pool.connect();
 try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(74108622)');const count=(await client.query<{count:string}>("SELECT count(*) FROM users WHERE role='admin'")).rows[0]!;if(user.role==='admin'&&Number(count.count)<2)throw new AppError(409,'LAST_ADMIN','Provision another administrator before deleting this account');await client.query('DELETE FROM users WHERE id=$1',[user.id]);await client.query('DELETE FROM mutation_receipts WHERE user_id=$1',[user.id]);await client.query('COMMIT');publishEvent({entityType:'user',eventType:'deleted',entityId:user.id,userId:user.id});res.clearCookie(sessionCookie,cookieOptions);res.sendStatus(204);}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
});
routes.get('/admin/export',requireAuth,requireAdmin,async(_req,res)=>res.json(await listShows(undefined,true)));
routes.post('/shows/import',requireAuth,requireAdmin,async(req,res)=>{const items=showInput.array().max(100).parse(req.body);const key=keyInput.parse(req.get('Idempotency-Key'));const imported=[];for(const [index,item]of items.entries())imported.push(await createShow(item,req.user!.id,key+'_'+index));res.status(201).json({items:imported});});
routes.get('/admin/users',requireAuth,requireAdmin,async(_req,res)=>res.json({items:(await pool.query<User>('SELECT id,email,role FROM users ORDER BY email')).rows}));
