import assert from 'node:assert/strict';

const origin = new URL(`https://${process.env.PROD_DOMAIN ?? 'revel.thiagobraga.dev'}`);
const gateway = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8080';
const headers = { Host: origin.host, 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '198.51.100.42' };
const get = (path) => fetch(new URL(path, gateway), { headers, signal: AbortSignal.timeout(30000) });

for (const path of ['/health', '/api/v1/health']) {
    const response = await get(path);
    assert.equal(response.status, 200, `${path} must be healthy`);
    assert.equal((await response.json()).status, 'ok');
}
const page = await get('/');
assert.equal(page.status, 200);
assert.ok(page.headers.get('Content-Security-Policy')?.includes(`wss://${origin.host}`), 'CSP must permit production WebSockets');
assert.ok(page.headers.get('Cache-Control')?.includes('no-store'), 'HTML must not be cached');
assert.ok((await page.text()).includes(`${origin.origin}/artwork/estrada-perdida-original.jpg`), 'Open Graph artwork must use the production origin');
const csrf = await get('/api/v1/auth/csrf');
assert.equal(csrf.status, 200);
const cookie = csrf.headers.get('Set-Cookie');
assert.ok(cookie?.includes('Secure') && cookie.includes('SameSite=Lax'), 'Production CSRF cookies must be secure and same-site');
assert.equal((await get('/api/v1/auth/me')).status, 401, 'Private routes must reject anonymous access');
const manifest = await get('/manifest.webmanifest');
assert.equal(manifest.status, 200);
assert.equal((await manifest.json()).display, 'standalone');
const worker = await get('/sw.js');
assert.equal(worker.status, 200);
assert.ok(worker.headers.get('Cache-Control')?.includes('no-store'), 'Service worker updates must reach clients');
console.log(`Production gateway checks passed for ${origin.origin}`);
