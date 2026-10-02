import { it, expect } from 'vitest';
import { openDB } from 'idb';
import { openOfflineDB, enqueue, replayQueue, listQueue, clearUserQueue, queryStorage } from './offlineQueue';
it('persists query caches, removes only the current user and repairs a missing index', async () => {
    await queryStorage.setItem('extra-user:queries', 'cached');
    await queryStorage.setItem('another-user:queries', 'keep');
    expect(await queryStorage.getItem('extra-user:queries')).toBe('cached');
    expect(await queryStorage.getItem('none')).toBeNull();
    await clearUserQueue('extra-user');
    expect(await queryStorage.getItem('extra-user:queries')).toBeNull();
    expect(await queryStorage.getItem('another-user:queries')).toBe('keep');
    await queryStorage.removeItem('another-user:queries');
    const initial = await openOfflineDB();
    const version = initial.version + 1;
    initial.close();
    const broken = await openDB('revel-offline', version, { upgrade(_db, _old, _new, tx) {
            tx.objectStore('queue').deleteIndex('by-user');
        } });
    broken.close();
    const repaired = await openOfflineDB();
    expect(repaired.transaction('queue').store.indexNames.contains('by-user')).toBe(true);
    repaired.close();
});
it('rejects unsafe routes and payloads and retains conflicts and session failures', async () => {
    await expect(enqueue('extra-user', { method: 'POST', path: '/account', body: {} })).rejects.toThrow('Unsupported');
    await expect(enqueue('extra-user', { method: 'POST', path: '/shows', body: { title: '<script>' } })).rejects.toThrow('Invalid');
    await clearUserQueue('extra-user');
    await enqueue('extra-user', { method: 'POST', path: '/shows', body: { title: 'conflict' } });
    expect((await replayQueue('extra-user', async () => {
        throw { status: 409 };
    })).conflicts).toBe(1);
    for (const status of [401, 403, 0, 500])
        await replayQueue('extra-user', async () => {
            throw { status };
        });
    await replayQueue('extra-user', async () => {
        throw new Error('network');
    });
    expect((await listQueue('extra-user'))[0]?.attempts).toBe(5);
    await clearUserQueue('extra-user');
});
it('prevents concurrent replay and handles poison records from older clients', async () => {
    await enqueue('extra-user', { method: 'POST', path: '/shows', body: { title: 'one' } });
    let release: (() => void) | undefined;
    const first = replayQueue('extra-user', () => new Promise<void>(resolve => {
        release = resolve;
    }));
    for (let i = 0; i < 20 && !release; i++)
        await new Promise(resolve => setTimeout(resolve, 1));
    expect(await replayQueue('extra-user', async () => {
    })).toEqual({ completed: 0, discarded: 0, conflicts: 0 });
    release?.();
    await first;
    const db = await openOfflineDB();
    await db.put('queue', { id: 'poison', userId: 'extra-user', createdAt: 0, attempts: 0, method: 'POST', path: '/account', body: {} });
    db.close();
    expect((await replayQueue('extra-user', async () => {
    })).discarded).toBe(1);
    expect(await listQueue('extra-user')).toHaveLength(0);
    await clearUserQueue('extra-user');
});
