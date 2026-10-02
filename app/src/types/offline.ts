import type { DBSchema } from 'idb';
export interface Mutation {
    method: 'POST' | 'PATCH' | 'DELETE';
    path: string;
    body: Record<string, unknown>;
}
export interface QueueItem extends Mutation {
    id: string;
    userId: string;
    createdAt: number;
    attempts: number;
}
export interface OfflineDB extends DBSchema {
    queue: {
        key: string;
        value: QueueItem;
        indexes: {
            'by-user': string;
        };
    };
    cache: {
        key: string;
        value: unknown;
    };
}
export interface ReplayResult {
    completed: number;
    discarded: number;
    conflicts: number;
}
export interface InstallEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
    }>;
}
