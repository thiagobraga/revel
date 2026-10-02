import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChildrenProps } from '../types/ui';
import { AuthProvider, useAuth } from './AuthContext';
import { request, setApiUser } from '../api/client';
import { clearUserQueue } from '../utils/offlineQueue';
import { usePreferences } from '../stores/preferences';
const transport = vi.hoisted(() => ({ listeners: new Map<string, ((arg: unknown) => void)[]>(), disconnect: vi.fn(), off: vi.fn(), connect: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: () => {
        transport.connect();
        return { on: (name: string, callback: (arg: unknown) => void) => {
                transport.listeners.set(name, [...(transport.listeners.get(name) ?? []), callback]);
            }, off: transport.off, disconnect: transport.disconnect };
    } }));
vi.mock('../api/client', () => ({ request: vi.fn(), setApiUser: vi.fn() }));
vi.mock('../utils/offlineQueue', () => ({ clearUserQueue: vi.fn() }));
const user = { id: 'user', email: 'admin@example.test', role: 'admin' as const };
function mount() {
    const query = new QueryClient();
    const wrapper = ({ children }: ChildrenProps) => <QueryClientProvider client={query}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
    return { ...renderHook(useAuth, { wrapper }), query };
}
async function settle() {
    await act(() => Promise.resolve());
}
function emit(name: string, arg: unknown) {
    act(() => {
        for (const fn of transport.listeners.get(name) ?? [])
            fn(arg);
    });
}
beforeEach(() => {
    vi.clearAllMocks();
    transport.listeners.clear();
    localStorage.clear();
    usePreferences.setState({ theme: 'dark', locale: 'pt-BR' });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.mocked(clearUserQueue).mockResolvedValue(undefined);
    vi.mocked(request).mockImplementation(async (path) => {
        if (path === '/preferences')
            return { theme: 'dark', locale: 'pt-BR' } as never;
        return { user } as never;
    });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
it('owns identity, connection lifecycle, login and immediate logout data removal', async () => {
    const { result, query, unmount } = mount();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    await act(() => result.current.login(user.email, 'password'));
    expect(result.current.user).toEqual(user);
    expect(setApiUser).toHaveBeenCalledWith('user');
    expect(transport.connect).toHaveBeenCalled();
    query.setQueryData(['private'], { secret: true });
    emit('disconnect', 'transport close');
    expect(result.current.user).toEqual(user);
    await act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('revel-session-user')).toBeNull();
    expect(query.getQueryData(['private'])).toBeUndefined();
    expect(clearUserQueue).toHaveBeenCalledWith('user');
    expect(localStorage.getItem('revel-pending-logout')).toBeNull();
    unmount();
    expect(transport.disconnect).toHaveBeenCalled();
});
it('restores online identity and refreshes/saves preferences without echo loops', async () => {
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    const { result } = mount();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await settle();
    act(() => usePreferences.getState().setTheme('light'));
    await settle();
    expect(request).toHaveBeenCalledWith('/preferences', expect.objectContaining({ method: 'PATCH', body: { theme: 'light', locale: 'pt-BR' } }));
    vi.mocked(request).mockImplementation(async (path) => {
        if (path === '/preferences')
            return { theme: 'light', locale: 'en' } as never;
        return { user } as never;
    });
    emit('sync', { entityType: 'preferences' });
    await settle();
    expect(usePreferences.getState().locale).toBe('en');
    emit('sync', { entityType: 'show' });
    emit('disconnect', 'io server disconnect');
    await waitFor(() => expect(result.current.user).toBeNull());
});
it('restores offline and network-failed cached identity, clears invalid or rejected caches', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    let view = mount();
    await waitFor(() => expect(view.result.current.user).toEqual(user));
    await act(() => view.result.current.logout());
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    view.unmount();
    localStorage.removeItem('revel-pending-logout');
    localStorage.setItem('revel-session-user', 'invalid JSON');
    view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(localStorage.getItem('revel-session-user')).toBeNull();
    view.unmount();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    vi.mocked(request).mockRejectedValue(new TypeError('Network unavailable'));
    view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.user).toEqual(user);
    view.unmount();
    localStorage.setItem('revel-session-user', 'invalid JSON');
    view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.user).toBeNull();
    view.unmount();
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    vi.mocked(request).mockRejectedValue(Object.assign(new Error('Unauthenticated'), { status: 401 }));
    view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.user).toBeNull();
});
it('wipes corrupted cached identities and revokes a pending logout on reconnect', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.loading).toBe(false));
    localStorage.setItem('revel-session-user', 'invalid JSON');
    act(() => window.dispatchEvent(new Event('revel:unauthorized')));
    await settle();
    expect(localStorage.getItem('revel-session-user')).toBeNull();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await act(() => result.current.login(user.email, 'password'));
    await act(() => result.current.logout());
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(localStorage.getItem('revel-pending-logout')).toBeNull();
});
it('retains a logout marker on failures and clears already-revoked sessions', async () => {
    localStorage.setItem('revel-pending-logout', '1');
    vi.mocked(request).mockRejectedValue(new Error('Network unavailable'));
    let view = mount();
    await settle();
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    view.unmount();
    vi.mocked(request).mockRejectedValue('unexpected failure');
    view = mount();
    await settle();
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    view.unmount();
    vi.mocked(request).mockRejectedValue(Object.assign(new Error('Server unavailable'), { status: 503 }));
    view = mount();
    await settle();
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    view.unmount();
    vi.mocked(request).mockRejectedValue(Object.assign(new Error('Already revoked'), { status: 401 }));
    mount();
    await settle();
    expect(localStorage.getItem('revel-pending-logout')).toBeNull();
});
it('fails closed on socket authentication rejection and completes interrupted local cleanup', async () => {
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    const { result, unmount } = mount();
    await waitFor(() => expect(result.current.loading).toBe(false));
    emit('connect_error', new Error('Transport unavailable'));
    expect(result.current.user).toEqual(user);
    emit('connect_error', new Error('Unauthenticated'));
    await waitFor(() => expect(result.current.user).toBeNull());
    unmount();
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    localStorage.setItem('revel-pending-logout', '1');
    mount();
    await settle();
    expect(localStorage.getItem('revel-session-user')).toBeNull();
    expect(clearUserQueue).toHaveBeenCalledWith('user');
});
it('retains cleanup on a failed online logout and ignores late mount responses', async () => {
    const view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    await act(() => view.result.current.login(user.email, 'password'));
    vi.mocked(request).mockRejectedValue(new Error('Offline'));
    await act(() => view.result.current.logout());
    expect(view.result.current.user).toBeNull();
    expect(localStorage.getItem('revel-pending-logout')).toBe('1');
    view.unmount();
    localStorage.removeItem('revel-pending-logout');
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    let resolve: ((value: unknown) => void) | undefined;
    vi.mocked(request).mockImplementation(() => new Promise(r => {
        resolve = r;
    }));
    const late = mount();
    late.unmount();
    await act(async () => resolve!({ user }));
    expect(localStorage.getItem('revel-session-user')).toBe(JSON.stringify(user));
});
it('requires an auth provider', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {
    });
    expect(() => renderHook(useAuth)).toThrow('AuthProvider required');
    log.mockRestore();
});
it('waits for an in-flight cookie revocation before starting a new login', async () => {
    localStorage.setItem('revel-pending-logout', '1');
    let revoke: ((value: unknown) => void) | undefined;
    vi.mocked(request).mockImplementation(path => path === '/auth/logout' ? new Promise(resolve => {
        revoke = resolve;
    }) : Promise.resolve({ user } as never));
    const { result } = mount();
    await settle();
    let login: Promise<void> | undefined;
    act(() => {
        login = result.current.login(user.email, 'password');
    });
    await settle();
    expect(request).not.toHaveBeenCalledWith('/auth/login', expect.anything());
    revoke!(undefined);
    await act(() => login!);
    expect(vi.mocked(request).mock.calls.filter(([path]) => path === '/auth/logout')).toHaveLength(1);
    expect(result.current.user).toEqual(user);
});
it('handles locale-only save failures and ignores rejected stale requests', async () => {
    localStorage.setItem('revel-session-user', JSON.stringify(user));
    let view = mount();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    await settle();
    vi.mocked(request).mockRejectedValueOnce(new Error('Save unavailable'));
    act(() => usePreferences.getState().setLocale('en'));
    await settle();
    expect(request).toHaveBeenCalledWith('/preferences', expect.objectContaining({ method: 'PATCH', body: { theme: 'dark', locale: 'en' } }));
    view.unmount();
    let reject: ((value: unknown) => void) | undefined;
    vi.mocked(request).mockImplementation(() => new Promise((_resolve, r) => {
        reject = r;
    }));
    view = mount();
    view.unmount();
    await act(async () => reject!(new Error('Late network failure')));
    expect(localStorage.getItem('revel-session-user')).toBe(JSON.stringify(user));
});
