'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { request, setApiUser } from '../api/client';
import { clearUserQueue } from '../utils/offlineQueue';
import { usePreferences } from '../stores/preferences';
import { useSync } from '../hooks/useSync';
import type { AuthState, User, Preferences } from '../types/domain';
import type { ChildrenProps } from '../types/ui';
const AuthContext = createContext<AuthState | undefined>(undefined);
export function AuthProvider({ children }: ChildrenProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);
    const query = useQueryClient();
    useSync(socket);
    const accept = useCallback((value: User | null) => {
        setUser(value);
        setApiUser(value?.id);
        if (value)
            localStorage.setItem('revel-session-user', JSON.stringify(value));
        else
            localStorage.removeItem('revel-session-user');
    }, []);
    const clear = useCallback(async () => {
        const saved = localStorage.getItem('revel-session-user');
        accept(null);
        query.clear();
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as User;
                await clearUserQueue(parsed.id);
            }
            catch {
                localStorage.removeItem('revel-session-user');
            }
        }
    }, [accept, query]);
    useEffect(() => {
        let live = true;
        const saved = localStorage.getItem('revel-session-user');
        if (!saved || localStorage.getItem('revel-pending-logout')) {
            if (localStorage.getItem('revel-pending-logout'))
                void clear();
            setLoading(false);
        }
        else if (!navigator.onLine) {
            try {
                accept(JSON.parse(saved) as User);
            }
            catch {
                localStorage.removeItem('revel-session-user');
            }
            setLoading(false);
        }
        else
            request<{
                user: User;
            }>('/auth/me').then(r => {
                if (live)
                    accept(r.user);
            }).catch(error => {
                if (live) {
                    if (error?.status === 401)
                        void clear();
                    else {
                        try {
                            accept(JSON.parse(saved) as User);
                        }
                        catch {
                            void clear();
                        }
                    }
                }
            }).finally(() => {
                if (live)
                    setLoading(false);
            });
        const unauthorized = () => {
            void clear();
        };
        window.addEventListener('revel:unauthorized', unauthorized);
        return () => {
            live = false;
            window.removeEventListener('revel:unauthorized', unauthorized);
        };
    }, [accept, clear]);
    useEffect(() => {
        if (!user)
            return;
        const connection = io({ withCredentials: true, transports: ['websocket'] });
        connection.on('connect_error', error => {
            if (error.message === 'Unauthenticated')
                window.dispatchEvent(new Event('revel:unauthorized'));
        });
        connection.on('disconnect', reason => {
            if (reason === 'io server disconnect')
                window.dispatchEvent(new Event('revel:unauthorized'));
        });
        setSocket(connection);
        return () => {
            connection.disconnect();
            setSocket(null);
        };
    }, [user]);
    const logoutInFlight = useRef<Promise<void> | null>(null);
    const finishLogout = useCallback(() => {
        if (logoutInFlight.current)
            return logoutInFlight.current;
        const attempt = (async () => {
            if (navigator.onLine && localStorage.getItem('revel-pending-logout')) {
                try {
                    await request('/auth/logout', { method: 'POST' });
                    localStorage.removeItem('revel-pending-logout');
                }
                catch (error) {
                    if (error instanceof Error && 'status' in error && error.status === 401)
                        localStorage.removeItem('revel-pending-logout');
                }
            }
        })();
        logoutInFlight.current = attempt;
        void attempt.finally(() => {
            logoutInFlight.current = null;
        });
        return attempt;
    }, []);
    useEffect(() => {
        void finishLogout();
        const online = () => {
            void finishLogout();
        };
        window.addEventListener('online', online);
        return () => window.removeEventListener('online', online);
    }, [finishLogout]);
    useEffect(() => {
        if (!user)
            return;
        let active = true;
        let ready = false;
        const hydrate = () => request<Preferences>('/preferences').then(value => {
            if (active) {
                usePreferences.getState().setTheme(value.theme);
                usePreferences.getState().setLocale(value.locale);
                ready = true;
            }
        }).catch(() => {
            ready = true;
        });
        void hydrate();
        const unsubscribe = usePreferences.subscribe((value, previous) => {
            if (ready && navigator.onLine && (value.theme !== previous.theme || value.locale !== previous.locale))
                void request('/preferences', { method: 'PATCH', body: { theme: value.theme, locale: value.locale } }).catch(() => {
                });
        });
        const handler = (event: {
            entityType: string;
        }) => {
            if (event.entityType === 'preferences') {
                ready = false;
                void hydrate();
            }
        };
        socket?.on('sync', handler);
        return () => {
            active = false;
            unsubscribe();
            socket?.off('sync', handler);
        };
    }, [user, socket]);
    const login = async (email: string, password: string) => {
        await finishLogout();
        const result = await request<{
            user: User;
        }>('/auth/login', { method: 'POST', body: { email, password } });
        accept(result.user);
    };
    const logout = async () => {
        localStorage.setItem('revel-pending-logout', '1');
        await clear();
        await finishLogout();
    };
    return <AuthContext value={{ user, loading, login, logout }}>{children}</AuthContext>;
}
export function useAuth() {
    const value = useContext(AuthContext);
    if (!value)
        throw new Error('AuthProvider required');
    return value;
}
