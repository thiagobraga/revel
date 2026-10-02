import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import request from 'supertest';
import {createApp} from './server.js';
import {pool} from './db/pool.js';
import {connectRedis,closeRedis,redis} from './db/redis.js';
import {migrate} from './db/runMigrations.js';
import {provisionUser,digest} from './services/authService.js';
const app=createApp();const origin='http://localhost:3000';
const password='Revel-test-6w#Q9!Fz2026';
async function session(role:'admin'|'editor'='admin'){
 const email=role+'@example.test';const user=await provisionUser(email,password,role);const agent=request.agent(app);const csrf=(await agent.get('/api/v1/auth/csrf')).body.token as string;const response=await agent.post('/api/v1/auth/login').set('Origin',origin).set('X-CSRF-Token',csrf).send({email,password});expect(response.status).toBe(200);return {agent,csrf,user};
}
describe('HTTP security with real PostgreSQL and Redis',()=>{
 beforeAll(async()=>{await migrate();await connectRedis();});
 beforeEach(async()=>{await pool.query('TRUNCATE users,sessions,preferences,password_reset_tokens,shows,subscribers,mutation_receipts CASCADE');await redis.flushDb();});
 afterAll(async()=>{await closeRedis();await pool.end();});
 it('returns health, version, request IDs and structured 404 errors',async()=>{
  expect((await request(app).get('/api/v1/openapi.json')).body.openapi).toBe('3.1.0');const health=await request(app).get('/api/v1/health');expect(health.body.status).toBe('ok');expect(health.headers['x-request-id']).toBeTruthy();expect(health.headers['x-content-type-options']).toBe('nosniff');expect((await request(app).get('/api/v1/version')).body.buildId).toBeTruthy();expect((await request(app).get('/missing')).body.error.code).toBe('NOT_FOUND');
 });
 it('rejects cross-origin, missing origin and missing/forged CSRF',async()=>{
  expect((await request(app).post('/api/v1/auth/login').send({})).body.error.code).toBe('ORIGIN_REQUIRED');
  expect((await request(app).post('/api/v1/auth/login').set('Origin','https://evil.test').send({})).status).toBe(403);
  expect((await request(app).post('/api/v1/auth/login').set('Origin',origin).send({})).body.error.code).toBe('CSRF_REJECTED');
  expect((await request(app).post('/api/v1/auth/login').set('Origin',origin).set('X-CSRF-Token','forged.bad').set('Cookie','revel-csrf=forged.bad').send({})).status).toBe(403);
  const preflight=await request(app).options('/api/v1/shows').set('Origin',origin);expect(preflight.status).toBe(204);expect(preflight.headers['access-control-allow-origin']).toBe(origin);
 });
 it('keeps registration closed, revokes sessions on logout and validates JSON',async()=>{
  expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  const {agent,csrf}=await session();expect((await agent.get('/api/v1/auth/me')).body.user.role).toBe('admin');
  expect((await agent.post('/api/v1/auth/register').set('Origin',origin).set('X-CSRF-Token',csrf).send({})).status).toBe(404);
  expect((await agent.post('/api/v1/shows').set('Origin',origin).set('X-CSRF-Token',csrf).set('Idempotency-Key','a').send({title:'<script>alert(1)</script>'})).status).toBe(422);
  expect((await agent.post('/api/v1/shows').set('Origin',origin).set('X-CSRF-Token',csrf).set('Content-Type','application/json').send('{')).status).toBe(400);
  expect((await agent.post('/api/v1/auth/logout').set('Origin',origin).set('X-CSRF-Token',csrf)).status).toBe(204);expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
 });
 it('limits login attempts in Redis',async()=>{
  const agent=request.agent(app);const csrf=(await agent.get('/api/v1/auth/csrf')).body.token;for(let i=0;i<10;i++)expect((await agent.post('/api/v1/auth/login').set('Origin',origin).set('X-CSRF-Token',csrf).send({email:'unknown@example.test',password})).status).toBe(401);
  expect((await agent.post('/api/v1/auth/login').set('Origin',origin).set('X-CSRF-Token',csrf).send({email:'unknown@example.test',password})).status).toBe(429);
 });
 it('enforces roles, preferences, draft visibility and last-admin safety',async()=>{
  const editor=await session('editor');expect((await editor.agent.get('/api/v1/admin/users')).status).toBe(403);
  const admin=await session();expect((await admin.agent.get('/api/v1/admin/users')).body.items).toHaveLength(2);
  expect((await admin.agent.get('/api/v1/preferences')).body).toEqual({theme:'dark',locale:'pt-BR'});
  expect((await admin.agent.patch('/api/v1/preferences').set('Origin',origin).set('X-CSRF-Token',admin.csrf).send({theme:'light',locale:'en'})).body.theme).toBe('light');
  const show={title:'Teste',city:'Bauru',venue:'Local',startsAt:'2030-01-01T22:00:00.000Z',ticketUrl:null,published:false};
  const created=await admin.agent.post('/api/v1/shows').set('Origin',origin).set('X-CSRF-Token',admin.csrf).set('Idempotency-Key','draft').send(show);expect(created.status).toBe(201);
  expect((await request(app).get('/api/v1/shows')).body.items).toHaveLength(0);expect((await admin.agent.get('/api/v1/admin/shows')).body.items).toHaveLength(1);
  expect((await admin.agent.get('/api/v1/account/export')).body.preferences.theme).toBe('light');
  expect((await editor.agent.get('/api/v1/account/export')).body.preferences).toBeNull();
  expect((await admin.agent.delete('/api/v1/account').set('Origin',origin).set('X-CSRF-Token',admin.csrf)).body.error.code).toBe('LAST_ADMIN');
  expect((await editor.agent.delete('/api/v1/account').set('Origin',origin).set('X-CSRF-Token',editor.csrf)).status).toBe(204);
 });
 it('consumes password reset tokens once and revokes all sessions',async()=>{
  const {agent,csrf,user}=await session();expect((await agent.post('/api/v1/auth/forgot-password').set('Origin',origin).set('X-CSRF-Token',csrf).send({email:'unknown@example.test'})).status).toBe(200);
  await pool.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')",[digest('known-reset-token-123456789'),user.id]);
  const reset=()=>agent.post('/api/v1/auth/reset-password').set('Origin',origin).set('X-CSRF-Token',csrf).send({token:'known-reset-token-123456789',password:'New-Revel-9f#D4!Hk2026'});
  expect((await reset()).status).toBe(204);expect((await agent.get('/api/v1/auth/me')).status).toBe(401);expect((await reset()).status).toBe(422);
 });
 it('expires idle and absolute sessions and rejects weak passwords',async()=>{
  const {agent,user}=await session();await pool.query("UPDATE sessions SET last_seen_at=now()-interval '31 minutes' WHERE user_id=$1",[user.id]);expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  await expect(provisionUser('weak@example.test','password123')).rejects.toMatchObject({code:'WEAK_PASSWORD'});
 });
it('covers show HTTP mutations, cursor queries, import and email routes',async()=>{
 await migrate();await connectRedis();const {agent,csrf,user}=await session();const post=(path:string)=>agent.post('/api/v1'+path).set('Origin',origin).set('X-CSRF-Token',csrf);const input={title:'HTTP test',city:'Bauru',venue:'Local',startsAt:'2030-01-01T22:00:00.000Z',ticketUrl:null,published:true};
 const show=(await post('/shows').set('Idempotency-Key','http-show').send(input)).body;
 expect((await agent.patch('/api/v1/shows/'+show.id).set('Origin',origin).set('X-CSRF-Token',csrf).set('Idempotency-Key','http-edit').send({...input,title:'Changed',version:1})).body.version).toBe(2);
 expect((await request(app).get('/api/v1/shows?cursor=bad')).status).toBe(422);expect((await agent.get('/api/v1/admin/shows?cursor=bad')).status).toBe(422);
 expect((await agent.get('/api/v1/admin/export')).body.items.length).toBeGreaterThan(0);
 expect((await post('/shows/import').set('Idempotency-Key','http-import').send([input])).status).toBe(201);
 expect((await agent.delete('/api/v1/shows/'+show.id+'?version=2').set('Origin',origin).set('X-CSRF-Token',csrf).set('Idempotency-Key','http-delete')).body.id).toBe(show.id);
 expect((await agent.get('/api/v1/preferences')).status).toBe(200);expect((await post('/auth/forgot-password').send({email:user.email})).status).toBe(200);
 expect((await post('/newsletter').send({email:'news@example.test'})).status).toBe(200);const token='newsletter-http-token-123456';await pool.query('UPDATE subscribers SET token_hash=$1 WHERE email=$2',[digest(token),'news@example.test']);expect((await request(app).get('/api/v1/newsletter/confirm?token='+token)).status).toBe(200);expect((await post('/newsletter/unsubscribe').send({token})).status).toBe(204);
});

});
