import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {migrate} from '../db/runMigrations.js';
import {pool} from '../db/pool.js';
import {connectRedis,closeRedis} from '../db/redis.js';
import {createShow,listShows,updateShow,deleteShow} from './showService.js';
const user='00000000-0000-4000-8000-000000000002';const input={title:'Teste',city:'Bauru',venue:'Local',startsAt:'2030-01-01T23:00:00.000Z',ticketUrl:'https://tickets.test/revel',published:true};
beforeAll(async()=>{await migrate();await connectRedis();});beforeEach(async()=>{await pool.query('TRUNCATE shows,mutation_receipts');});afterAll(async()=>{await closeRedis();await pool.end();});
it('uses cursor pages without losing equal-timestamp rows',async()=>{
 for(let n=0;n<51;n++)await createShow({...input,title:'Show '+n},user,'page_'+n);
 const page=await listShows();expect(page.items).toHaveLength(50);expect(page.nextCursor).toBeTruthy();expect((await listShows(page.nextCursor!)).items).toHaveLength(1);
 for(const cursor of ['bad',Buffer.from('null').toString('base64url'),Buffer.from('{"date":"bad","id":"bad"}').toString('base64url')])await expect(listShows(cursor)).rejects.toMatchObject({code:'INVALID_CURSOR'});
});
it('rejects key reuse with changed payload, missing records and stale deletes',async()=>{
 const created=await createShow(input,user,'same');await expect(createShow({...input,title:'Changed'},user,'same')).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 await expect(updateShow('00000000-0000-4000-8000-000000000099',{...input,version:1},user,'missing')).rejects.toMatchObject({code:'NOT_FOUND'});
 const updated=await updateShow(created.id,{...input,version:1},user,'update');expect((await updateShow(created.id,{...input,version:1},user,'update')).version).toBe(updated.version);
 await expect(deleteShow(created.id,1,user,'stale')).rejects.toMatchObject({code:'CONFLICT'});await deleteShow(created.id,2,user,'delete');await deleteShow(created.id,2,user,'delete');
});
