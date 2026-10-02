import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PwaControls } from './PwaControls';
import { request } from '../api/client';
const state = vi.hoisted(() => ({ online: true, listeners: new Map<string, () => void>(), register: vi.fn(), skip: vi.fn() }));
vi.mock('../hooks/useOnlineStatus', () => ({ useOnlineStatus: () => state.online }));
vi.mock('../api/client', () => ({ request: vi.fn() }));
vi.mock('workbox-window', () => ({ Workbox: class {
        addEventListener(name: string, fn: () => void) {
            state.listeners.set(name, fn);
        }
        register = state.register;
        messageSkipWaiting = state.skip;
    } }));
beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.online = true;
    state.listeners.clear();
    vi.mocked(request).mockResolvedValue({ buildId: 'one' });
    state.register.mockResolvedValue(undefined);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_COVERAGE', 'false');
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});
it('registers a worker, handles waiting updates and offers a reload', async () => {
    const reload = vi.spyOn(location, 'reload').mockImplementation(() => {
    });
    render(<PwaControls />);
    await act(() => Promise.resolve());
    expect(state.register).toHaveBeenCalledOnce();
    act(() => state.listeners.get('waiting')!());
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(state.skip).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
});
it('keeps an offline indication, handles install/dismiss and observes version polling', async () => {
    state.online = false;
    const view = render(<PwaControls />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    state.online = true;
    view.rerender(<PwaControls />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt });
    act(() => window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('button', { name: 'Instalar REVEL' })).toBeNull();
    act(() => window.dispatchEvent(event));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Instalar REVEL' })));
    expect(prompt).toHaveBeenCalledOnce();
    vi.mocked(request).mockResolvedValue({ buildId: 'two' });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeVisible();
});
it('does not register during coverage/development or without worker support', async () => {
    vi.stubEnv('NEXT_PUBLIC_COVERAGE', 'true');
    render(<PwaControls />);
    await act(() => Promise.resolve());
    expect(state.register).not.toHaveBeenCalled();
    cleanup();
    vi.stubEnv('NEXT_PUBLIC_COVERAGE', 'false');
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(request).mockRejectedValue(new Error('Offline'));
    const reload = vi.spyOn(location, 'reload').mockImplementation(() => {
    });
    render(<PwaControls />);
    await act(() => Promise.resolve());
    vi.mocked(request).mockResolvedValue({ buildId: 'one' });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    vi.mocked(request).mockResolvedValue({ buildId: 'two' });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(reload).toHaveBeenCalledOnce();
    cleanup();
    vi.stubEnv('NODE_ENV', 'production');
    Reflect.deleteProperty(navigator, 'serviceWorker');
    render(<PwaControls />);
    expect(state.register).not.toHaveBeenCalled();
});
