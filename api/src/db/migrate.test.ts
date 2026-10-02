import {it,expect,afterAll} from 'vitest';
import {pool} from './pool.js';
import {migrate} from './runMigrations.js';
import {writeFileSync,rmSync} from 'node:fs';
it('serializes fresh migrations, rolls back failed SQL and detects modified history',async()=>{
 if(!process.env.DATABASE_URL?.endsWith('_test'))throw new Error('Destructive fixture requires a dedicated _test database');
 await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');await Promise.all([migrate(),migrate()]);
 const row=(await pool.query<{checksum:string}>('SELECT checksum FROM schema_migrations WHERE filename=$1',['001_core.sql'])).rows[0]!;await pool.query('UPDATE schema_migrations SET checksum=$1 WHERE filename=$2',['wrong','001_core.sql']);await expect(migrate()).rejects.toThrow('Applied migration changed');await pool.query('UPDATE schema_migrations SET checksum=$1 WHERE filename=$2',[row.checksum,'001_core.sql']);
 const file=new URL('./migrations/999_test_failure.sql',import.meta.url);writeFileSync(file,'CREATE TABLE rollback_probe(id int); SELECT missing_column FROM rollback_probe;');try{await expect(migrate()).rejects.toThrow();expect((await pool.query("SELECT to_regclass('rollback_probe') AS table_name")).rows[0].table_name).toBeNull();}finally{rmSync(file);}
 await migrate();
});
afterAll(()=>pool.end());
