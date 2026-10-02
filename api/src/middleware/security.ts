import type { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { redis } from '../db/redis.js';
import { authenticate } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';
import { securityLog } from '../utils/securityLogger.js';
export const sessionCookie = config.nodeEnv === 'production' ? '__Host-revel-session' : 'revel-session';
export const csrfCookie = config.nodeEnv === 'production' ? '__Host-revel-csrf' : 'revel-csrf';
export const cookieOptions = { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax' as const, path: '/' };
const sign = (value: string) => createHmac('sha256', config.csrfSecret).update(value).digest('base64url');
export function issueCsrf(res: Response) {
    const nonce = randomBytes(24).toString('base64url');
    const token = nonce + '.' + sign(nonce);
    res.cookie(csrfCookie, token, { ...cookieOptions, maxAge: 3600000 });
    return token;
}
function equal(a: string, b: string) {
    return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function originCheck(req: Request, res: Response, next: NextFunction) {
    const origin = req.get('Origin');
    if (origin && origin !== config.origin) {
        securityLog('origin_rejected');
        throw new AppError(403, 'ORIGIN_REJECTED', 'Origin is not allowed');
    }
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Idempotency-Key');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
        res.sendStatus(204);
        return;
    }
    if (!['GET', 'HEAD'].includes(req.method) && !origin)
        throw new AppError(403, 'ORIGIN_REQUIRED', 'Origin header required');
    next();
}
export function csrfCheck(req: Request, _res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }
    const token = req.get('X-CSRF-Token');
    const cookie: unknown = req.cookies[csrfCookie];
    const parts = token?.split('.');
    if (typeof cookie !== 'string' || !token || !equal(cookie, token) || parts?.length !== 2 || !parts[0] || !parts[1] || !equal(sign(parts[0]), parts[1]))
        throw new AppError(403, 'CSRF_REJECTED', 'Refresh the page and retry');
    next();
}
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const value: unknown = req.cookies[sessionCookie];
    const user = await authenticate(typeof value === 'string' ? value : undefined);
    if (!user)
        throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required');
    req.user = user;
    next();
}
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
    if (req.user?.role !== 'admin')
        throw new AppError(403, 'FORBIDDEN', 'Administrator access required');
    next();
}
export async function authRateLimit(req: Request, _res: Response, next: NextFunction) {
    const key = 'rate:auth:' + req.ip;
    const hits = await redis.eval("local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],900) end;return n", { keys: [key], arguments: [] });
    if (Number(hits) > 10)
        throw new AppError(429, 'RATE_LIMITED', 'Too many attempts; try again in 15 minutes');
    next();
}
