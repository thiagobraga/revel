import { createHash } from 'node:crypto';
import sanitize from 'sanitize-html';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';
import type { Show, ShowInput, ShowRow } from '../types/domain.js';
import { AppError } from '../utils/AppError.js';
import { publishEvent } from './syncService.js';
export const mapShow = (r: ShowRow): Show => ({ id: r.id, title: r.title, city: r.city, venue: r.venue, startsAt: r.starts_at.toISOString(), ticketUrl: r.ticket_url, published: r.published, version: r.version, updatedAt: r.updated_at.toISOString() });
export async function listShows(cursor?: string, includeDrafts = false) {
    let after: {
        date: string;
        id: string;
    } | null = null;
    if (cursor) {
        try {
            const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
            if (typeof parsed !== 'object' || !parsed || !('date' in parsed) || !('id' in parsed) || typeof parsed.date !== 'string' || typeof parsed.id !== 'string' || !Number.isFinite(Date.parse(parsed.date)) || !/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(parsed.id))
                throw new Error();
            after = { date: parsed.date, id: parsed.id };
        }
        catch {
            throw new AppError(422, 'INVALID_CURSOR', 'Invalid pagination cursor');
        }
    }
    const result = await pool.query<ShowRow>('SELECT * FROM shows WHERE ($1::boolean OR published) AND ($2::timestamptz IS NULL OR (starts_at,id)>($2::timestamptz,$3::uuid)) ORDER BY starts_at,id LIMIT 51', [includeDrafts, after?.date ?? null, after?.id ?? null]);
    const items = result.rows.slice(0, 50).map(mapShow);
    const last = items.at(-1);
    return { items, nextCursor: result.rows.length > 50 && last ? Buffer.from(JSON.stringify({ date: last.startsAt, id: last.id })).toString('base64url') : null };
}
async function mutate<T>(userId: string, key: string, payload: unknown, operation: (client: PoolClient) => Promise<T>): Promise<{
    value: T;
    fresh: boolean;
}> {
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [userId + ':' + key]);
        const existing = (await client.query<{
            fingerprint: string;
            result: T;
        }>('SELECT fingerprint,result FROM mutation_receipts WHERE user_id=$1 AND key=$2', [userId, key])).rows[0];
        if (existing) {
            if (existing.fingerprint !== fingerprint)
                throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was used for a different request');
            await client.query('COMMIT');
            return { value: existing.result, fresh: false };
        }
        const value = await operation(client);
        await client.query('INSERT INTO mutation_receipts(user_id,key,fingerprint,result) VALUES($1,$2,$3,$4)', [userId, key, fingerprint, JSON.stringify(value)]);
        await client.query('COMMIT');
        return { value, fresh: true };
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
function fields(input: ShowInput) {
    const clean = (s: string) => sanitize(s, { allowedTags: [], allowedAttributes: {} }).trim();
    return [clean(input.title), clean(input.city), clean(input.venue), input.startsAt, input.ticketUrl, input.published];
}
export async function createShow(input: ShowInput, userId: string, key: string) {
    const result = await mutate(userId, key, { method: 'create', input }, async (client) => mapShow((await client.query<ShowRow>('INSERT INTO shows(title,city,venue,starts_at,ticket_url,published) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', fields(input))).rows[0]!));
    if (result.fresh)
        publishEvent({ entityType: 'show', eventType: 'created', entityId: result.value.id, userId });
    return result.value;
}
export async function updateShow(id: string, input: ShowInput & {
    version: number;
}, userId: string, key: string) {
    const result = await mutate(userId, key, { method: 'update', id, input }, async (client) => {
        const row = (await client.query<ShowRow>('UPDATE shows SET title=$1,city=$2,venue=$3,starts_at=$4,ticket_url=$5,published=$6,version=version+1,updated_at=now() WHERE id=$7 AND version=$8 RETURNING *', [...fields(input), id, input.version])).rows[0];
        if (!row) {
            const found = await client.query('SELECT id FROM shows WHERE id=$1', [id]);
            throw new AppError(found.rowCount ? 409 : 404, found.rowCount ? 'CONFLICT' : 'NOT_FOUND', found.rowCount ? 'Show changed on another device; reload before editing' : 'Show not found');
        }
        return mapShow(row);
    });
    if (result.fresh)
        publishEvent({ entityType: 'show', eventType: 'updated', entityId: id, userId });
    return result.value;
}
export async function deleteShow(id: string, version: number, userId: string, key: string) {
    const result = await mutate(userId, key, { method: 'delete', id, version }, async (client) => {
        const row = await client.query('DELETE FROM shows WHERE id=$1 AND version=$2 RETURNING id', [id, version]);
        if (!row.rowCount)
            throw new AppError(409, 'CONFLICT', 'Show changed or was deleted');
        return { id };
    });
    if (result.fresh)
        publishEvent({ entityType: 'show', eventType: 'deleted', entityId: id, userId });
    return result.value;
}
