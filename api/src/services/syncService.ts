import type { SyncServer } from '../types/socket.js';
import { randomUUID } from 'node:crypto';
import type { SyncEvent } from '../types/domain.js';
let io: SyncServer | undefined;
export function setSyncServer(server: SyncServer) {
    io = server;
}
export function publishEvent(event: Omit<SyncEvent, 'id' | 'emittedAt'>) {
    const payload = { ...event, id: randomUUID(), emittedAt: new Date().toISOString() };
    const room = event.entityType === 'show' ? 'band:revel' : 'user:' + event.userId;
    io?.to(room).emit('sync', payload);
}
