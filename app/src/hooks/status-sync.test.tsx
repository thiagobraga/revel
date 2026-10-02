import { afterEach, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { ChildrenProps } from '../types/ui';
import type { SyncEvent } from '../types/domain';
import { useOnlineStatus } from './useOnlineStatus';
import { useSync } from './useSync';
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
it('observes network transitions and has an online server snapshot', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result, unmount } = renderHook(useOnlineStatus);
    expect(result.current).toBe(true);
    online.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
    online.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
    unmount();
    const Read = () => String(useOnlineStatus());
    expect(renderToString(<Read />)).toBe('true');
});
it('invalidates only the affected server records and removes listeners', () => {
    const query = new QueryClient();
    const invalidate = vi.spyOn(query, 'invalidateQueries');
    const wrapper = ({ children }: ChildrenProps) => <QueryClientProvider client={query}>{children}</QueryClientProvider>;
    let handler: ((event: SyncEvent) => void) | undefined;
    const on = vi.fn((_name: string, callback: (event: SyncEvent) => void) => {
        handler = callback;
    });
    const off = vi.fn();
    const socket = { on, off } as unknown as Socket;
    const { rerender, unmount } = renderHook(({ value }) => useSync(value), { initialProps: { value: null as Socket | null }, wrapper });
    expect(on).not.toHaveBeenCalled();
    rerender({ value: socket });
    for (const entityType of ['show', 'preferences', 'user'] as const)
        handler!({ entityType, id: 'id', eventType: 'updated', entityId: 'id', userId: 'user', emittedAt: 'now' });
    expect(invalidate).toHaveBeenCalledTimes(2);
    unmount();
    expect(off).toHaveBeenCalledWith('sync', handler);
});
