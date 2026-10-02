import { beforeEach, it, expect } from 'vitest';
import { enqueue, listQueue, clearUserQueue, replayQueue } from './offlineQueue';
beforeEach(async () => {
    await clearUserQueue('user-a');
    await clearUserQueue('user-b');
});
it('replays in order and isolates user data', async () => {
    await enqueue('user-a', { method: 'POST', path: '/shows', body: { title: 'one' } });
    await enqueue('user-b', { method: 'POST', path: '/shows', body: { title: 'other' } });
    await enqueue('user-a', { method: 'POST', path: '/shows', body: { title: 'two' } });
    const seen: string[] = [];
    await replayQueue('user-a', async (item) => {
        seen.push(String(item.body.title));
    });
    expect(seen).toEqual(['one', 'two']);
    expect(await listQueue('user-a')).toHaveLength(0);
    expect(await listQueue('user-b')).toHaveLength(1);
});
it('keeps transient failures and drops poison items with a visible result', async () => {
    await enqueue('user-a', { method: 'POST', path: '/shows', body: { title: 'bad' } });
    const result = await replayQueue('user-a', async () => {
        throw { status: 422 };
    });
    expect(result.discarded).toBe(1);
    await enqueue('user-a', { method: 'POST', path: '/shows', body: { title: 'retry' } });
    await replayQueue('user-a', async () => {
        throw { status: 503 };
    });
    expect(await listQueue('user-a')).toHaveLength(1);
});
it('preserves the idempotency key of a request with an uncertain network outcome', async () => {
    const item = await enqueue('user-a', { method: 'POST', path: '/shows', body: { title: 'possibly committed' } }, 'original-request-id');
    expect(item.id).toBe('original-request-id');
    const keys: string[] = [];
    await replayQueue('user-a', async (queued) => {
        keys.push(queued.id);
    });
    expect(keys).toEqual(['original-request-id']);
});
