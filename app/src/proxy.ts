import { NextResponse, type NextRequest } from 'next/server';
export function proxy(request: NextRequest) {
    const nonce = btoa(crypto.randomUUID());
    const development = process.env.NODE_ENV !== 'production';
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url);
    const host = origin.host;
    const sockets = development ? 'ws://' + host + ' wss://' + host : (origin.protocol === 'https:' ? 'wss://' : 'ws://') + host;
    const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' ${development ? "'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${sockets}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; worker-src 'self'; manifest-src 'self'`;
    const headers = new Headers(request.headers);
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    const response = NextResponse.next({ request: { headers } });
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Cache-Control', 'no-store');
    return response;
}
export const config = { matcher: ['/((?!api|socket.io|_next/static|_next/image|health|.*\\.[a-zA-Z0-9]+$).*)'] };
