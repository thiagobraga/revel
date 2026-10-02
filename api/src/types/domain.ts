export interface User {
    id: string;
    email: string;
    role: 'admin' | 'editor';
}
export interface SessionUser extends User {
    sessionId: string;
}
export interface ShowInput {
    title: string;
    city: string;
    venue: string;
    startsAt: string;
    ticketUrl: string | null;
    published: boolean;
}
export interface Show extends ShowInput {
    id: string;
    version: number;
    updatedAt: string;
}
export interface ShowRow {
    id: string;
    title: string;
    city: string;
    venue: string;
    starts_at: Date;
    ticket_url: string | null;
    published: boolean;
    version: number;
    updated_at: Date;
}
export interface SyncEvent {
    id: string;
    entityType: 'show' | 'user' | 'preferences' | 'subscriber';
    eventType: 'created' | 'updated' | 'deleted';
    entityId: string;
    userId: string;
    emittedAt: string;
}
export interface Preferences {
    theme: 'light' | 'dark';
    locale: 'pt-BR' | 'en';
}
