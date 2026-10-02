import { afterEach, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import Home from './page';
import RootLayout, { generateMetadata } from './layout';
import LoginPage from './login/page';
import AdminPage from './admin/page';
import ForgotPage from './forgot-password/page';
import ResetPage from './reset-password/page';
import ConfirmPage from './newsletter/confirm/page';
import Styleguide from './styleguide/page';
import { GET } from './health/route';
import { proxy } from '../proxy';
import { headers } from 'next/headers';
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('../components/Providers', () => ({ Providers: ({ children }: {
        children: import('react').ReactNode;
    }) => children }));
vi.mock('../components/PwaControls', () => ({ PwaControls: () => null }));
vi.mock('../components/PublicSite', () => ({ PublicSite: (props: unknown) => <pre>{JSON.stringify(props)}</pre> }));
vi.mock('../components/LoginForm', () => ({ LoginForm: () => <p>Login form</p> }));
vi.mock('../components/AdminShows', () => ({ AdminShows: () => <p>Show editor</p> }));
vi.mock('../components/PasswordForm', () => ({ PasswordForm: ({ token }: {
        token?: string;
    }) => <p>{token ?? 'Forgot password'}</p> }));
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});
it('renders server agenda data and configured links, with honest failure states', async () => {
    vi.stubEnv('INTERNAL_API_URL', 'http://api:4000');
    for (const key of ['SPOTIFY_URL', 'BANDCAMP_URL', 'YOUTUBE_URL', 'INSTAGRAM_URL', 'CONTACT_URL', 'PETROLEO_URL'])
        vi.stubEnv(key, 'https://revel.test');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], nextCursor: null })));
    vi.stubGlobal('fetch', fetch);
    expect(renderToStaticMarkup(await Home())).toContain('https://revel.test');
    vi.unstubAllEnvs();
    vi.stubEnv('INTERNAL_API_URL', undefined);
    for (const key of ['SPOTIFY_URL', 'BANDCAMP_URL', 'YOUTUBE_URL', 'INSTAGRAM_URL', 'CONTACT_URL', 'PETROLEO_URL'])
        vi.stubEnv(key, undefined);
    fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(renderToStaticMarkup(await Home())).toContain('agendaUnavailable&quot;:true');
    fetch.mockRejectedValueOnce(new Error('Network unavailable'));
    expect(renderToStaticMarkup(await Home())).toContain('agendaUnavailable&quot;:true');
});
it('renders auth routes, styleguide and health without hidden domain logic', async () => {
    expect(renderToStaticMarkup(LoginPage())).toContain('Login form');
    expect(renderToStaticMarkup(AdminPage())).toContain('Show editor');
    expect(renderToStaticMarkup(ForgotPage())).toContain('Forgot password');
    expect(renderToStaticMarkup(await ResetPage({ searchParams: Promise.resolve({ token: 'token' }) }))).toContain('token');
    expect(renderToStaticMarkup(await ResetPage({ searchParams: Promise.resolve({}) }))).toContain('Forgot password');
    expect(renderToStaticMarkup(Styleguide())).toContain('--footer-bg');
    expect(await GET().json()).toEqual({ status: 'ok' });
});
it('handles invalid, confirmed, expired and temporarily unavailable newsletter links', async () => {
    expect(renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve({}) }))).toContain('Link inválido.');
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    vi.stubEnv('INTERNAL_API_URL', 'http://api:4000');
    expect(renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve({ token: 'token&safe' }) }))).toContain('Inscrição confirmada.');
    expect(fetch).toHaveBeenCalledWith('http://api:4000/api/v1/newsletter/confirm?token=token%26safe', { cache: 'no-store' });
    vi.unstubAllEnvs();
    vi.stubEnv('INTERNAL_API_URL', undefined);
    fetch.mockResolvedValueOnce(new Response(null, { status: 422 }));
    expect(renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve({ token: 'token' }) }))).toContain('expirado');
    fetch.mockRejectedValueOnce(new Error('Offline'));
    expect(renderToStaticMarkup(await ConfirmPage({ searchParams: Promise.resolve({ token: 'token' }) }))).toContain('Tente novamente');
});
it('configures metadata, nonce bootstrap and both production/development manifests', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-nonce': 'nonce' }) as never);
    expect(renderToStaticMarkup(await RootLayout({ children: <p>Content</p> }))).toContain('nonce="nonce"');
    vi.mocked(headers).mockResolvedValue(new Headers() as never);
    expect(renderToStaticMarkup(await RootLayout({ children: <p>Content</p> }))).toContain('apple-touch-startup-image');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://revel.test');
    vi.stubEnv('NODE_ENV', 'production');
    expect(new URL(String((await generateMetadata()).metadataBase)).hostname).toBe('revel.test');
    expect((await generateMetadata()).manifest).toBe('/manifest.webmanifest');
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    vi.stubEnv('NODE_ENV', 'test');
    expect((await generateMetadata()).metadataBase).toBeUndefined();
    expect((await generateMetadata()).manifest).toBe('/manifest.dev.webmanifest');
});
it('applies a nonce CSP and permits only same-host sockets for the actual scheme', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://revel.test');
    let response = proxy(new NextRequest('https://revel.test/'));
    expect(response.headers.get('Content-Security-Policy')).toContain('wss://revel.test');
    expect(response.headers.get('Content-Security-Policy')).not.toContain('unsafe-eval');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    vi.stubEnv('NODE_ENV', 'development');
    response = proxy(new NextRequest('http://localhost:3000/'));
    expect(response.headers.get('Content-Security-Policy')).toContain('unsafe-eval');
    vi.stubEnv('NODE_ENV', 'production');
    response = proxy(new NextRequest('http://localhost:3000/'));
    expect(response.headers.get('Content-Security-Policy')).toContain('ws://localhost:3000');
});
