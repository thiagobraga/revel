import { z } from 'zod';
const failureSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
        super(message);
    }
}
let csrf: string | undefined;
let currentUserId: string | undefined;
export function setApiUser(id: string | undefined) {
    currentUserId = id;
    csrf = undefined;
}
async function csrfToken() {
    if (!csrf) {
        const response = await fetch('/api/v1/auth/csrf', { credentials: 'include', cache: 'no-store' });
        if (!response.ok)
            throw new ApiError(response.status, 'CSRF_UNAVAILABLE', 'Cannot initialise secure request');
        csrf = (await response.json() as {
            token: string;
        }).token;
    }
    return csrf;
}
export async function request<T>(path: string, options: {
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
} = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (method !== 'GET')
        headers['X-CSRF-Token'] = await csrfToken();
    if (options.idempotencyKey)
        headers['Idempotency-Key'] = options.idempotencyKey;
    const response = await fetch('/api/v1' + path, { method, credentials: 'include', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), cache: 'no-store' });
    if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const parsed = failureSchema.safeParse(payload);
        const data = parsed.success ? parsed.data : { error: { code: 'HTTP_ERROR', message: 'Request failed. Please try again.' } };
        if (response.status === 401) {
            csrf = undefined;
            if (currentUserId)
                window.dispatchEvent(new Event('revel:unauthorized'));
        }
        if (response.status === 403)
            csrf = undefined;
        throw new ApiError(response.status, data.error.code, data.error.message);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
}
