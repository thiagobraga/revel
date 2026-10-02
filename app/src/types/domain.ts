export interface User {
    id: string;
    email: string;
    role: 'admin' | 'editor';
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
export interface ShowPage {
    items: Show[];
    nextCursor: string | null;
}
export interface Preferences {
    theme: 'dark' | 'light';
    locale: 'pt-BR' | 'en';
}
export interface ApiFailure {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export interface SyncEvent {
    id: string;
    entityType: 'show' | 'user' | 'preferences' | 'subscriber';
    eventType: 'created' | 'updated' | 'deleted';
    entityId: string;
    userId: string;
    emittedAt: string;
}
export interface AuthState {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}
export interface KeyboardChord {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}
export interface SiteLinks {
    spotify: string;
    bandcamp: string;
    youtube: string;
    instagram: string;
    contact: string;
    petroleo: string;
}
