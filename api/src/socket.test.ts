import { beforeAll, afterAll, it, expect } from 'vitest';
import { io as clientIo } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { createHttpServer } from './server.js';
import { pool } from './db/pool.js';
import { connectRedis, closeRedis } from './db/redis.js';
import { migrate } from './db/runMigrations.js';
import { provisionUser, login, logout, authenticate } from './services/authService.js';
import { publishEvent } from './services/syncService.js';
const server = createHttpServer();
let url: string;
beforeAll(async () => {
    await migrate();
    await connectRedis();
    await new Promise<void>(resolve => server.http.listen(0, '127.0.0.1', resolve));
    url = 'http://127.0.0.1:' + (server.http.address() as AddressInfo).port;
});
afterAll(async () => {
    await new Promise<void>(resolve => server.io.close(() => resolve()));
    await closeRedis();
    if (!pool.ended)
        await pool.end();
});
it('rejects absent sessions and cross-origin sockets', async () => {
    for (const origin of ['http://localhost:3000', 'https://evil.test']) {
        const socket = clientIo(url, { extraHeaders: { Origin: origin }, reconnection: false });
        const message = await new Promise<string>(resolve => socket.once('connect_error', err => resolve(err.message)));
        expect(message).toBe('Unauthenticated');
        socket.close();
    }
});
it('authorizes the band room, delivers changes and blocks revoked sessions', async () => {
    const user = await provisionUser('socket@example.test', 'Revel-test-6w#Q9!Fz2026');
    const session = await login(user.email, 'Revel-test-6w#Q9!Fz2026');
    const socket = clientIo(url, { extraHeaders: { Origin: 'http://localhost:3000', Cookie: 'revel-session=' + session.token }, reconnection: false });
    await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });
    const received = new Promise<{
        entityId: string;
    }>(resolve => socket.once('sync', resolve));
    publishEvent({ entityType: 'show', eventType: 'created', entityId: 'show-1', userId: user.id });
    expect((await received).entityId).toBe('show-1');
    const connected = await authenticate(session.token);
    await logout(connected!);
    const disconnected = new Promise<string>(resolve => socket.once('disconnect', resolve));
    socket.emit('check');
    expect(await disconnected).toBe('io server disconnect');
    socket.close();
});
it('validates live packets and expires idle sockets without refreshing inactivity', async () => {
    const user = await provisionUser('idle@example.test', 'Revel-test-6w#Q9!Fz2026');
    const session = await login(user.email, 'Revel-test-6w#Q9!Fz2026');
    const socket = clientIo(url, { extraHeaders: { Origin: 'http://localhost:3000', Cookie: 'revel-session=' + session.token }, reconnection: false });
    await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });
    socket.emit('check');
    await new Promise(resolve => setTimeout(resolve, 15050));
    expect(socket.connected).toBe(true);
    await pool.query("UPDATE sessions SET last_seen_at=now()-interval '31 minutes' WHERE user_id=$1", [user.id]);
    expect(await authenticate(session.token, false)).toBeNull();
    const disconnected = new Promise<string>(resolve => socket.once('disconnect', resolve));
    expect(await disconnected).toBe('io server disconnect');
    socket.close();
}, 40000);
it('fails closed when session storage is unavailable', async () => {
    const user = await provisionUser('storage@example.test', 'Revel-test-6w#Q9!Fz2026');
    const session = await login(user.email, 'Revel-test-6w#Q9!Fz2026');
    const socket = clientIo(url, { extraHeaders: { Origin: 'http://localhost:3000', Cookie: 'revel-session=' + session.token }, reconnection: false });
    await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
    });
    const disconnected = new Promise<string>(resolve => socket.once('disconnect', resolve));
    await pool.end();
    expect(await disconnected).toBe('io server disconnect');
    socket.close();
});
