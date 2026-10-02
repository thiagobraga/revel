import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export default function setup(){
 if(!process.env.DATABASE_URL?.endsWith('_test'))throw new Error('E2E requires a dedicated _test database');
 const api=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../api');
 execFileSync(process.execPath,['--input-type=module','-e',"import {Pool} from 'pg';const db=new Pool({connectionString:process.env.DATABASE_URL});try{await db.query('TRUNCATE shows,mutation_receipts,preferences');}finally{await db.end();}"],{cwd:api,stdio:'pipe',env:process.env});
 execFileSync(process.execPath,['--input-type=module','-e',"import {createClient} from 'redis';const redis=createClient({url:process.env.REDIS_URL});await redis.connect();const keys=await redis.keys('rate:auth:*');if(keys.length)await redis.del(keys);await redis.close();"],{cwd:api,stdio:'pipe',env:process.env});
 execFileSync(process.execPath,['dist/db/provisionUser.js','e2e@example.test','Revel-test-6w#Q9!Fz2026','admin'],{cwd:api,stdio:'pipe',env:process.env});
}
