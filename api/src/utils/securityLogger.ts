import pino from 'pino';
export const logger = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info', redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', 'req.url', 'req.query.token', 'res.headers["set-cookie"]', 'password', 'token', 'key'] });
export function securityLog(event: string, fields: Record<string, unknown> = {}) {
    logger.warn({ event, ...fields }, 'security');
}
