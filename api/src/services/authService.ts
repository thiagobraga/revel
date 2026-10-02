import argon2 from 'argon2';
import zxcvbn from 'zxcvbn';
import {createHash,randomBytes} from 'node:crypto';
import {pool} from '../db/pool.js';
import {config} from '../config.js';
import {AppError} from '../utils/AppError.js';
import {securityLog} from '../utils/securityLogger.js';
import {sendEmail} from './emailService.js';
import {publishEvent} from './syncService.js';
import type {SessionUser,User} from '../types/domain.js';

export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function validatePassword(password:string){if(password.length<12||password.length>128||zxcvbn(password).score<3)throw new AppError(422,'WEAK_PASSWORD','Use a strong password with at least 12 characters');}
export async function provisionUser(email:string,password:string,role:User['role']='admin'){
 validatePassword(password);const hash=await argon2.hash(password,{type:argon2.argon2id});
 const result=await pool.query<User>('INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET password_hash=$2,role=$3 RETURNING id,email,role',[email.toLowerCase(),hash,role]);
 const user=result.rows[0]!;await pool.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);publishEvent({entityType:'user',eventType:'updated',entityId:user.id,userId:user.id});return user;
}
const dummyHash=argon2.hash(randomBytes(32).toString('hex'));
export async function login(email:string,password:string){
 const result=await pool.query<User&{password_hash:string}>('SELECT id,email,role,password_hash FROM users WHERE email=$1',[email.toLowerCase()]);const row=result.rows[0];
 const valid=await argon2.verify(row?.password_hash??await dummyHash,password);
 if(!row||!valid){securityLog('login_failed');throw new AppError(401,'INVALID_CREDENTIALS','Invalid email or password');}
 const token=randomBytes(32).toString('base64url');
 await pool.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+$3*interval '1 hour')",[row.id,digest(token),config.sessionAbsoluteHours]);
 securityLog('login_success',{userId:row.id});return {token,user:{id:row.id,email:row.email,role:row.role}};
}
export async function authenticate(token:string|undefined,touch=true):Promise<SessionUser|null>{
 if(!token)return null;
 const result=await pool.query<SessionUser>(touch?`UPDATE sessions s SET last_seen_at=now() FROM users u WHERE s.user_id=u.id AND s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-$2*interval '1 minute' RETURNING u.id,u.email,u.role,s.id AS "sessionId"`:`SELECT u.id,u.email,u.role,s.id AS "sessionId" FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-$2*interval '1 minute'`,[digest(token),config.sessionIdleMinutes]);
 return result.rows[0]??null;
}
export async function logout(user:SessionUser){await pool.query('DELETE FROM sessions WHERE id=$1',[user.sessionId]);publishEvent({entityType:'user',eventType:'deleted',entityId:user.sessionId,userId:user.id});}
export async function forgotPassword(email:string){
 const row=(await pool.query<User>('SELECT id,email,role FROM users WHERE email=$1',[email.toLowerCase()])).rows[0];if(!row)return;
 const token=randomBytes(32).toString('base64url');await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1',[row.id]);await pool.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[digest(token),row.id]);
 await sendEmail(row.email,'Reset your Revel password',config.origin+'/reset-password?token='+token);
}
export async function resetPassword(token:string,password:string){
 validatePassword(password);const hash=await argon2.hash(password);const client=await pool.connect();
 try{await client.query('BEGIN');const result=await client.query<{user_id:string}>('DELETE FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',[digest(token)]);const row=result.rows[0];if(!row)throw new AppError(422,'INVALID_TOKEN','Reset link has expired');await client.query('UPDATE users SET password_hash=$1 WHERE id=$2',[hash,row.user_id]);await client.query('DELETE FROM sessions WHERE user_id=$1',[row.user_id]);await client.query('COMMIT');publishEvent({entityType:'user',eventType:'updated',entityId:row.user_id,userId:row.user_id});}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
