import { describe, it, expect } from 'vitest';
import { loadConfig } from './config.js';
describe('config', () => {
    it('requires database, redis and origin', () => {
        expect(() => loadConfig({})).toThrow();
    });
    it('rejects weak production secrets', () => {
        expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x:x@db/revel', REDIS_URL: 'redis://:x@redis', CORS_ORIGIN: 'https://revel.test', CSRF_SECRET: 'weak' })).toThrow();
    });
    it('uses safe development defaults', () => {
        const c = loadConfig({ DATABASE_URL: 'postgres://revel@localhost/revel', REDIS_URL: 'redis://localhost', CORS_ORIGIN: 'http://localhost:3000', CSRF_SECRET: 'development-secret-0123456789' });
        expect(c.port).toBe(4000);
        expect(c.sessionIdleMinutes).toBe(30);
    });
});
