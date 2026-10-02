import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pool} from './pool.js';

export async function migrate(){
 const client=await pool.connect();
 try {
  await client.query('SELECT pg_advisory_lock(74108621)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  const directory=new URL('./migrations/',import.meta.url);
  const files=(await readdir(directory)).filter(f=>/^\d+_.+\.sql$/.test(f)).sort();
  for(const filename of files){
   const sql=await readFile(new URL(filename,directory),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
   const applied=await client.query<{checksum:string}>('SELECT checksum FROM schema_migrations WHERE filename=$1',[filename]);
   if(applied.rows[0]){if(applied.rows[0].checksum!==checksum)throw new Error('Applied migration changed: '+filename);continue;}
   await client.query('BEGIN');
   try{await client.query(sql);await client.query('INSERT INTO schema_migrations(filename,checksum) VALUES($1,$2)',[filename,checksum]);await client.query('COMMIT');}
   catch(error){await client.query('ROLLBACK');throw error;}
  }
 }finally{await client.query('SELECT pg_advisory_unlock(74108621)');client.release();}
}
