import {it,expect} from 'vitest';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {loadConfig} from './config.js';
const base={NODE_ENV:'production',DATABASE_URL:'postgres://revel:2tK4Q9f8cP6vB7nJ0zM5@db/revel',REDIS_URL:'redis://:2tK4Q9f8cP6vB7nJ0zM5@redis',CORS_ORIGIN:'https://revel.test',CSRF_SECRET:'6f9a3c7e2b8d1f0a4c5e9b7d3a2f8c1e',RESEND_API_KEY:'re_2tK4Q9f8cP6vB7nJ0zM5',EMAIL_FROM:'Revel <noreply@mail.revel.test>'};
it('validates production and reads file secrets without logging them',()=>{expect(loadConfig(base).nodeEnv).toBe('production');const dir=mkdtempSync(tmpdir()+'/revel-config-');const file=dir+'/secret';writeFileSync(file,base.CSRF_SECRET+'\n');expect(loadConfig({...base,CSRF_SECRET_FILE:file}).csrfSecret).toBe(base.CSRF_SECRET);rmSync(dir,{recursive:true});});
it('rejects every weak production configuration and malformed URLs',()=>{
 for(const override of [{DATABASE_URL:'postgres://revel:x@db/revel'},{REDIS_URL:'redis://:x@redis'},{CSRF_SECRET:'development-csrf-secret-123456789123456789'},{CORS_ORIGIN:'http://revel.test'},{RESEND_API_KEY:''},{EMAIL_FROM:'noreply@example.test'},{DATABASE_URL:'https://db/revel'},{REDIS_URL:'https://redis'}])expect(()=>loadConfig({...base,...override})).toThrow();
});
