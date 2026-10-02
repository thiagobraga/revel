import { openDB } from 'idb';
import type { OfflineDB, Mutation, QueueItem, ReplayResult } from '../types/offline';
export async function openOfflineDB() {
    let db = await openDB<OfflineDB>('revel-offline', undefined, { upgrade(database) {
            const store = database.createObjectStore('queue', { keyPath: 'id' });
            store.createIndex('by-user', 'userId');
            database.createObjectStore('cache');
        } });
    if (!db.transaction('queue').store.indexNames.contains('by-user')) {
        const version = db.version + 1;
        db.close();
        db = await openDB<OfflineDB>('revel-offline', version, { upgrade(_database, _old, _new, tx) {
                tx.objectStore('queue').createIndex('by-user', 'userId');
            } });
    }
    return db;
}
function validateMutation(mutation: Mutation) {
    if (!['POST', 'PATCH', 'DELETE'].includes(mutation.method) || !/^\/shows(?:\/[a-f\d-]{36})?(?:\?version=\d+)?$/i.test(mutation.path))
        throw new Error('Unsupported offline mutation');
    const serialized = JSON.stringify(mutation.body);
    if (serialized.length > 8192 || /[<>]/.test(serialized))
        throw new Error('Invalid queued payload');
}
export async function enqueue(userId: string, mutation: Mutation, id = crypto.randomUUID()) {
    validateMutation(mutation);
    const item: QueueItem = { ...mutation, id, userId, createdAt: Date.now(), attempts: 0 };
    const db = await openOfflineDB();
    await db.put('queue', item);
    db.close();
    return item;
}
export async function listQueue(userId: string) {
    const db = await openOfflineDB();
    const items = await db.getAllFromIndex('queue', 'by-user', userId);
    db.close();
    return items.sort((a, b) => a.createdAt - b.createdAt);
}
export async function clearUserQueue(userId: string) {
    const db = await openOfflineDB();
    const tx = db.transaction(['queue', 'cache'], 'readwrite');
    const items = await tx.objectStore('queue').index('by-user').getAll(userId);
    for (const item of items)
        await tx.objectStore('queue').delete(item.id);
    for (const key of await tx.objectStore('cache').getAllKeys())
        if (key.startsWith(userId + ':'))
            await tx.objectStore('cache').delete(key);
    await tx.done;
    db.close();
}
const replaying = new Set<string>();
export async function replayQueue(userId: string, send: (item: QueueItem) => Promise<unknown>): Promise<ReplayResult> {
    const result = { completed: 0, discarded: 0, conflicts: 0 };
    if (replaying.has(userId))
        return result;
    replaying.add(userId);
    try {
        for (const item of await listQueue(userId)) {
            const db = await openOfflineDB();
            try {
                validateMutation(item);
            }
            catch {
                await db.delete('queue', item.id);
                db.close();
                result.discarded++;
                continue;
            }
            try {
                await send(item);
                await db.delete('queue', item.id);
                result.completed++;
            }
            catch (error) {
                const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
                if (status === 409) {
                    result.conflicts++;
                    break;
                }
                if (status === 401 || status === 403 || status === 0 || status >= 500) {
                    item.attempts++;
                    await db.put('queue', item);
                    break;
                }
                await db.delete('queue', item.id);
                result.discarded++;
            }
            finally {
                db.close();
            }
        }
    }
    finally {
        replaying.delete(userId);
    }
    return result;
}
export const queryStorage = {
    async getItem(key: string) {
        const db = await openOfflineDB();
        const value = await db.get('cache', key);
        db.close();
        return typeof value === 'string' ? value : null;
    },
    async setItem(key: string, value: string) {
        const db = await openOfflineDB();
        await db.put('cache', value, key);
        db.close();
    },
    async removeItem(key: string) {
        const db = await openOfflineDB();
        await db.delete('cache', key);
        db.close();
    }
};
