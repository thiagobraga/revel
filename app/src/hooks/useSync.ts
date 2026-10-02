'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { SyncEvent } from '../types/domain';
export function useSync(socket: Socket | null) {
    const query = useQueryClient();
    useEffect(() => {
        if (!socket)
            return;
        const handler = (event: SyncEvent) => {
            if (event.entityType === 'show')
                void query.invalidateQueries({ queryKey: ['shows'] });
            if (event.entityType === 'preferences')
                void query.invalidateQueries({ queryKey: ['preferences'] });
        };
        socket.on('sync', handler);
        return () => {
            socket.off('sync', handler);
        };
    }, [socket, query]);
}
