import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicSite } from './PublicSite';
import { usePreferences } from '../stores/preferences';
import { request } from '../api/client';
import type { ShowPage, SiteLinks } from '../types/domain';
vi.mock('../api/client', () => ({ request: vi.fn() }));
const blank: SiteLinks = { spotify: '', bandcamp: '', youtube: '', instagram: '', contact: '', petroleo: '' };
const empty: ShowPage = { items: [], nextCursor: null };
const show = { id: 'one', title: 'Confirmed show', city: 'Bauru', venue: 'Venue', startsAt: '2030-01-01T20:00:00Z', ticketUrl: 'https://tickets.revel.test', published: true, version: 1, updatedAt: '2030-01-01T20:00:00Z' };
function mount(items = empty, links = blank, unavailable = false) {
    vi.mocked(request).mockResolvedValue(items);
    const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={query}><PublicSite initialShows={items} agendaUnavailable={unavailable} links={links}/></QueryClientProvider>);
    return query;
}
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    usePreferences.setState({ theme: 'dark', locale: 'pt-BR' });
});
afterEach(cleanup);
it('keeps unset links honest, toggles locale/theme and closes keyboard navigation', async () => {
    const query = mount();
    expect(screen.getByText('Novas datas a caminho.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir agora' }));
    expect(screen.getByRole('status')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Tema escuro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Idioma / Language' }));
    expect(screen.getByText('Noise, concrete and resistance.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Idioma / Language' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('navigation')).toHaveAttribute('id', 'mobile-navigation');
    fireEvent.click(screen.getByRole('link', { name: 'Manifesto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
    await act(() => query.invalidateQueries({ queryKey: ['shows'] }));
    expect(request).toHaveBeenCalledWith('/shows');
});
it('renders both ticket states, real external links and the unavailable agenda message', () => {
    const links = Object.fromEntries(Object.keys(blank).map(key => [key, 'https://revel.test/' + key])) as unknown as SiteLinks;
    mount({ items: [show, { ...show, id: 'two', ticketUrl: null }], nextCursor: null }, links);
    expect(screen.getAllByRole('link', { name: /Ingressos/ })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', links.instagram);
    cleanup();
    mount(empty, blank, true);
    expect(screen.getByText('Agenda temporariamente indisponível.')).toBeVisible();
});
it('reports double opt-in submission success and both error shapes', async () => {
    mount();
    const form = screen.getByLabelText('Seu e-mail').closest('form')!;
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'fan@example.test' } });
    vi.mocked(request).mockResolvedValueOnce({});
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Confira seu e-mail'));
    vi.mocked(request).mockRejectedValueOnce(new Error('Mail unavailable'));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Mail unavailable'));
    vi.mocked(request).mockRejectedValueOnce('failure');
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Erro'));
});
