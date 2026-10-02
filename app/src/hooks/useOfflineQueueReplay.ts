'use client';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { replayQueue, queryStorage } from '../utils/offlineQueue';
import { request } from '../api/client';
export function useOfflineQueueReplay() {
    const { user } = useAuth();
    const online = useOnlineStatus();
    const query = useQueryClient();
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (!user)
            return;
        const storage = { ...queryStorage, setItem: async (key: string, value: string) => {
                const saved = localStorage.getItem('revel-session-user');
                if (saved && JSON.parse(saved).id === user.id)
                    await queryStorage.setItem(key, value);
            } };
        const persister = createAsyncStoragePersister({ storage, key: user.id + ':queries' });
        const [unsubscribe] = persistQueryClient({ queryClient: query, persister, buster: (process.env.NEXT_PUBLIC_BUILD_ID ?? 'development') + ':' + user.id, maxAge: 86400000 });
        return unsubscribe;
    }, [user, query]);
    useEffect(() => {
        if (!user || !online)
            return;
        let active = true;
        void replayQueue(user.id, item => request(item.path, { method: item.method, body: item.method === 'DELETE' ? undefined : item.body, idempotencyKey: item.id })).then(result => {
            if (!active)
                return;
            if (result.conflicts)
                setMessage('Conflito: revise a alteração pendente antes de sincronizar.');
            else if (result.discarded)
                setMessage('Uma alteração inválida foi descartada.');
            else if (result.completed) {
                setMessage('Alterações sincronizadas.');
                void query.invalidateQueries({ queryKey: ['shows'] });
            }
        });
        return () => {
            active = false;
        };
    }, [user, online, query]);
    return { online, message };
}
