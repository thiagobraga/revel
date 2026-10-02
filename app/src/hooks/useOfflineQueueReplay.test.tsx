import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '../types/domain';
import type { ChildrenProps } from '../types/ui';
import { useOfflineQueueReplay } from './useOfflineQueueReplay';
import { replayQueue, queryStorage } from '../utils/offlineQueue';
import { request } from '../api/client';
const state = vi.hoisted(() => ({ user: null as User | null, online: true, unsubscribe: vi.fn(), storage: undefined as undefined | {
        setItem: (key: string, value: string) => Promise<void>;
    } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => state }));
vi.mock('./useOnlineStatus', () => ({ useOnlineStatus: () => state.online }));
vi.mock('../api/client', () => ({ request: vi.fn() }));
vi.mock('../utils/offlineQueue', () => ({ replayQueue: vi.fn(), queryStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } }));
vi.mock('@tanstack/query-async-storage-persister', () => ({ createAsyncStoragePersister: (options: {
        storage: typeof state.storage;
    }) => {
        state.storage = options.storage;
        return {};
    } }));
vi.mock('@tanstack/react-query-persist-client', () => ({ persistQueryClient: () => [state.unsubscribe, Promise.resolve()] }));
const user = { id: 'user', email: 'admin@example.test', role: 'admin' as const };
function mount() {
    const query = new QueryClient();
    const wrapper = ({ children }: ChildrenProps) => <QueryClientProvider client={query}>{children}</QueryClientProvider>;
    return { ...renderHook(useOfflineQueueReplay, { wrapper }), query };
}
beforeEach(() => {
    vi.clearAllMocks();
    state.user = null;
    state.online = true;
    localStorage.clear();
    vi.mocked(replayQueue).mockResolvedValue({ completed: 0, discarded: 0, conflicts: 0 });
    vi.mocked(request).mockResolvedValue({});
});
afterEach(cleanup);
it('isolates persisted cache and refuses writes after logout or user switch', async () => {
    const { rerender, unmount } = mount();
    expect(replayQueue).not.toHaveBeenCalled();
    state.user = user;
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    rerender();
    await act(() => Promise.resolve());
    await state.storage!.setItem('user:queries', 'data');
    expect(queryStorage.setItem).toHaveBeenCalledWith('user:queries', 'data');
    localStorage.removeItem('revel-session-user');
    await state.storage!.setItem('user:queries', 'data');
    localStorage.setItem('revel-session-user', JSON.stringify({ ...user, id: 'other' }));
    await state.storage!.setItem('user:queries', 'data');
    expect(queryStorage.setItem).toHaveBeenCalledTimes(1);
    unmount();
    expect(state.unsubscribe).toHaveBeenCalled();
});
it('sends stable keys for every verb and reports conflicts, discarded items and success', async () => {
    state.user = user;
    vi.mocked(replayQueue).mockImplementation(async (_id, send) => {
        for (const method of ['POST', 'DELETE'] as const)
            await send({ id: 'key', userId: 'user', method, path: '/shows', body: { title: 'one' }, createdAt: 1, attempts: 0 });
        return { completed: 0, discarded: 0, conflicts: 1 };
    });
    let view = mount();
    await act(() => Promise.resolve());
    expect(view.result.current.message).toContain('Conflito');
    expect(request).toHaveBeenCalledWith('/shows', { method: 'DELETE', body: undefined, idempotencyKey: 'key' });
    view.unmount();
    vi.mocked(replayQueue).mockResolvedValue({ completed: 0, discarded: 1, conflicts: 0 });
    view = mount();
    await act(() => Promise.resolve());
    expect(view.result.current.message).toContain('inválida');
    view.unmount();
    vi.mocked(replayQueue).mockResolvedValue({ completed: 1, discarded: 0, conflicts: 0 });
    view = mount();
    const invalidate = vi.spyOn(view.query, 'invalidateQueries');
    await act(() => Promise.resolve());
    expect(view.result.current.message).toContain('sincronizadas');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shows'] });
});
it('waits while offline and ignores late replay results after unmount', async () => {
    state.user = user;
    state.online = false;
    let view = mount();
    expect(replayQueue).not.toHaveBeenCalled();
    view.unmount();
    state.online = true;
    let resolve: ((value: {
        completed: number;
        discarded: number;
        conflicts: number;
    }) => void) | undefined;
    vi.mocked(replayQueue).mockImplementation(() => new Promise(r => {
        resolve = r;
    }));
    view = mount();
    const invalidate = vi.spyOn(view.query, 'invalidateQueries');
    view.unmount();
    await act(async () => resolve!({ completed: 1, discarded: 0, conflicts: 0 }));
    expect(invalidate).not.toHaveBeenCalled();
});
