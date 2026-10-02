import {it,expect,vi} from 'vitest';
it('uses host-prefixed secure cookies and structured non-test logging',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('DATABASE_URL','postgres://revel:2tK4Q9f8cP6vB7nJ0zM5@db/revel');vi.stubEnv('REDIS_URL','redis://:2tK4Q9f8cP6vB7nJ0zM5@redis');vi.stubEnv('CORS_ORIGIN','https://revel.test');vi.stubEnv('CSRF_SECRET','6f9a3c7e2b8d1f0a4c5e9b7d3a2f8c1e');vi.stubEnv('RESEND_API_KEY','re_2tK4Q9f8cP6vB7nJ0zM5');vi.stubEnv('EMAIL_FROM','Revel <noreply@mail.revel.test>');
 try{vi.resetModules();const security=await import('./security.js');expect(security.sessionCookie).toBe('__Host-revel-session');expect(security.csrfCookie).toBe('__Host-revel-csrf');expect(security.cookieOptions).toMatchObject({httpOnly:true,secure:true,path:'/'});const {logger}=await import('../utils/securityLogger.js');expect(logger.level).toBe('info');}finally{vi.unstubAllEnvs();vi.resetModules();}
});
