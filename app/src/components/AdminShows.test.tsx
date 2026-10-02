import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User, ShowPage } from '../types/domain';
import { AdminShows } from './AdminShows';
import { request } from '../api/client';
import { enqueue, listQueue, clearUserQueue } from '../utils/offlineQueue';
const auth = vi.hoisted(() => ({ user: { id: 'user', email: 'admin@example.test', role: 'admin' } as User | null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('./AppShell', () => ({ AppShell: ({ children }: {
        children: import('react').ReactNode;
    }) => children }));
vi.mock('../api/client', () => ({ request: vi.fn() }));
vi.mock('../utils/offlineQueue', () => ({ enqueue: vi.fn(), listQueue: vi.fn(), clearUserQueue: vi.fn() }));
const show = { id: '1e271df8-2650-42b8-85f4-9635df850965', title: 'Fixture show', city: 'Bauru', venue: 'Venue', startsAt: '2030-01-01T20:00:00Z', ticketUrl: null, published: true, version: 1, updatedAt: '2030-01-01T20:00:00Z' };
let data: ShowPage;
let failure: unknown;
function mount() {
    const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={query}><AdminShows /></QueryClientProvider>);
    return { query, view };
}
function fill() {
    for (const [label, value] of [['Título', 'New show'], ['Cidade', 'Bauru'], ['Local', 'Venue'], ['Data e hora', '2030-02-01T20:00']])
        fireEvent.change(screen.getByLabelText(label!), { target: { value } });
}
function submit() {
    fireEvent.submit(screen.getByLabelText('Título').closest('form')!);
}
beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 'user', email: 'admin@example.test', role: 'admin' };
    data = { items: [show], nextCursor: null };
    failure = undefined;
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.mocked(listQueue).mockResolvedValue([]);
    vi.mocked(enqueue).mockResolvedValue({ id: 'queued', userId: 'user', createdAt: 1, attempts: 0, method: 'POST', path: '/shows', body: {} });
    vi.mocked(clearUserQueue).mockResolvedValue(undefined);
    vi.mocked(request).mockImplementation(async (path, options) => {
        if (path === '/admin/shows')
            return data as never;
        if (failure)
            throw failure;
        return options?.method === 'DELETE' ? { id: show.id } as never : show as never;
    });
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
it('creates a show, edits versioned data, cancels editing and resets the form', async () => {
    mount();
    await screen.findByText('Fixture show');
    fill();
    fireEvent.change(screen.getByLabelText('Link dos ingressos (HTTPS)'), { target: { value: 'https://tickets.revel.test' } });
    fireEvent.click(screen.getByLabelText('Publicado na agenda'));
    submit();
    await screen.findByText('Show salvo.');
    expect(screen.getByLabelText('Título')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('heading', { name: 'Editar show' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    submit();
    await screen.findByText('Show salvo.');
    expect(request).toHaveBeenCalledWith('/shows/' + show.id, expect.objectContaining({ method: 'PATCH', body: expect.objectContaining({ version: 1 }) }));
});
it('queues offline writes and preserves uncertain online request keys', async () => {
    vi.mocked(listQueue).mockResolvedValue([{ id: 'pending', userId: 'user', createdAt: 1, attempts: 0, method: 'POST', path: '/shows', body: {} }]);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { view, query } = mount();
    fill();
    submit();
    await screen.findByText('Alteração salva neste dispositivo.');
    expect(enqueue).toHaveBeenCalledWith('user', expect.objectContaining({ method: 'POST' }), expect.any(String));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar fila pendente' }));
    await screen.findByText('Fila descartada. Recarregue os dados antes de editar.');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    failure = new TypeError('Network failed');
    fill();
    submit();
    await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(2));
    const requestKey = vi.mocked(request).mock.calls.find(([, options]) => options?.method === 'POST')![1]!.idempotencyKey;
    expect(vi.mocked(enqueue).mock.calls[1]![2]).toBe(requestKey);
    auth.user = null;
    view.rerender(<QueryClientProvider client={query}><AdminShows /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Descartar fila pendente' }));
    fill();
    submit();
    await screen.findByText('Sign in required');
});
it('shows validation, write and read errors with safe generic fallback', async () => {
    mount();
    fill();
    failure = new Error('Write denied');
    submit();
    await screen.findByText('Write denied');
    failure = 'unknown failure';
    submit();
    await screen.findByText('Falha ao salvar.');
    cleanup();
    vi.mocked(request).mockRejectedValue(new Error('Read unavailable'));
    mount();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('Read unavailable');
});
it('confirms deletion, reverts failed optimistic writes and reports generic errors', async () => {
    const { query } = mount();
    await screen.findByText('Fixture show');
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(request).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'DELETE' }));
    confirm.mockReturnValue(true);
    failure = Object.assign(new Error('Conflict'), { status: 409 });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await screen.findByText('Conflict');
    expect(await screen.findByText('Fixture show')).toBeVisible();
    failure = 'unknown';
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await screen.findByText('Falha ao excluir');
    await screen.findByText('Fixture show');
    query.removeQueries({ queryKey: ['shows', 'admin'] });
    failure = undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/shows/' + show.id + '?version=1', expect.objectContaining({ method: 'DELETE', body: undefined })));
});
it('displays a draft with ticket metadata', async () => {
    data = { items: [{ ...show, published: false, ticketUrl: 'https://tickets.revel.test' }], nextCursor: null };
    mount();
    await screen.findByText('Fixture show');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Link dos ingressos (HTTPS)')).toHaveValue('https://tickets.revel.test');
    expect(screen.getByLabelText('Publicado na agenda')).not.toBeChecked();
});
it('queues an uncertain gateway failure using the same request key', async () => {
    failure = Object.assign(new Error('Gateway unavailable'), { status: 502 });
    mount();
    fill();
    submit();
    await waitFor(() => expect(enqueue).toHaveBeenCalled());
    const sent = vi.mocked(request).mock.calls.find(([, options]) => options?.method === 'POST')![1]!.idempotencyKey;
    expect(vi.mocked(enqueue).mock.calls[0]![2]).toBe(sent);
});
