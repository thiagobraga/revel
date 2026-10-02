import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { migrate } from '../db/runMigrations.js';
import { pool } from '../db/pool.js';
import { connectRedis, closeRedis, redis } from '../db/redis.js';
import { createShow, listShows, updateShow, deleteShow } from './showService.js';
describe('show service with real PostgreSQL/Redis', () => {
    beforeAll(async () => {
        await migrate();
        await connectRedis();
    });
    beforeEach(async () => {
        await pool.query('TRUNCATE shows, mutation_receipts');
        await redis.flushDb();
    });
    afterAll(async () => {
        await closeRedis();
        await pool.end();
    });
    it('creates, paginates, updates with version check and deletes', async () => {
        const input = { title: 'REVEL ao vivo', city: 'Bauru', venue: 'Local de teste', startsAt: '2030-01-01T23:00:00.000Z', ticketUrl: null, published: true };
        const s = await createShow(input, '00000000-0000-4000-8000-000000000001', 'create-1');
        expect((await listShows()).items[0]?.id).toBe(s.id);
        const replay = await createShow(input, '00000000-0000-4000-8000-000000000001', 'create-1');
        expect(replay.id).toBe(s.id);
        const edited = await updateShow(s.id, { ...input, title: 'Outro título', version: 1 }, '00000000-0000-4000-8000-000000000001', 'update-1');
        expect(edited.version).toBe(2);
        await expect(updateShow(s.id, { ...input, version: 1 }, '00000000-0000-4000-8000-000000000001', 'update-2')).rejects.toMatchObject({ code: 'CONFLICT' });
        await deleteShow(s.id, 2, '00000000-0000-4000-8000-000000000001', 'delete-1');
        expect((await listShows()).items).toHaveLength(0);
    });
});
