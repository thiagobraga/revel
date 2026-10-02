import { it, expect, vi, afterEach } from 'vitest';
import { request, setApiUser } from './client';
afterEach(() => {
    vi.unstubAllGlobals();
    setApiUser(undefined);
});
it('sends typed reads and secure idempotent writes with reusable CSRF', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }))).mockResolvedValueOnce(new Response(JSON.stringify({ token: 'signed.token' }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'one' }))).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    expect(await request('/shows')).toEqual({ items: [] });
    await request('/shows', { method: 'POST', body: { title: 'show' }, idempotencyKey: 'same' });
    expect(fetch.mock.calls[2]![1]).toMatchObject({ headers: { 'X-CSRF-Token': 'signed.token', 'Idempotency-Key': 'same' }, body: '{"title":"show"}', credentials: 'include' });
    expect(await request('/auth/logout', { method: 'POST' })).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(4);
});
it('clears CSRF on denial and logs out authenticated clients on 401', async () => {
    const unauthorized = vi.fn();
    window.addEventListener('revel:unauthorized', unauthorized);
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Sign in' } }), { status: 401 })));
    vi.stubGlobal('fetch', fetch);
    await expect(request('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).not.toHaveBeenCalled();
    setApiUser('user');
    await expect(request('/auth/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(unauthorized).toHaveBeenCalledOnce();
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'CSRF_REJECTED', message: 'Retry' } }), { status: 403 }));
    await expect(request('/shows')).rejects.toMatchObject({ status: 403 });
    window.removeEventListener('revel:unauthorized', unauthorized);
});
it('fails closed if CSRF cannot be initialized', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(request('/shows', { method: 'POST' })).rejects.toMatchObject({ code: 'CSRF_UNAVAILABLE' });
});
it('preserves HTTP status when a gateway returns HTML or malformed error JSON', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('Bad gateway', { status: 502 })).mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: 'response' }), { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    await expect(request('/shows')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
    await expect(request('/shows')).rejects.toMatchObject({ status: 503, code: 'HTTP_ERROR' });
});
