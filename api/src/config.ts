import { readFileSync } from 'node:fs';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';
import type { Config } from './types/config.js';
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const get = (name: string, fallback = ''): string => {
        const filename = env[name + '_FILE'];
        return filename ? readFileSync(filename, 'utf8').trim() : env[name] ?? fallback;
    };
    const schema = z.object({
        nodeEnv: z.enum(['development', 'test', 'production']), port: z.coerce.number().int().min(1).max(65535),
        databaseUrl: z.url().refine(v => v.startsWith('postgres://') || v.startsWith('postgresql://'), 'PostgreSQL URL required'),
        redisUrl: z.url().refine(v => /^rediss?:/.test(v), 'Redis URL required'), origin: z.url(), csrfSecret: z.string().min(24),
        resendKey: z.string(), emailFrom: z.string().min(3), sessionIdleMinutes: z.coerce.number().int().positive(), sessionAbsoluteHours: z.coerce.number().int().positive()
    });
    const value = schema.parse({ nodeEnv: get('NODE_ENV', 'development'), port: get('PORT', '4000'), databaseUrl: get('DATABASE_URL'), redisUrl: get('REDIS_URL'), origin: get('CORS_ORIGIN'), csrfSecret: get('CSRF_SECRET'), resendKey: get('RESEND_API_KEY'), emailFrom: get('EMAIL_FROM', 'Revel <noreply@example.test>'), sessionIdleMinutes: get('SESSION_IDLE_TTL_MINUTES', '30'), sessionAbsoluteHours: get('SESSION_ABSOLUTE_TTL_HOURS', '12') });
    if (value.nodeEnv === 'production') {
        for (const url of [value.databaseUrl, value.redisUrl])
            if (decodeURIComponent(new URL(url).password).length < 20 || zxcvbn(decodeURIComponent(new URL(url).password)).score < 3)
                throw new Error('Production connection passwords require at least 20 characters');
        if (value.csrfSecret.length < 32 || zxcvbn(value.csrfSecret).score < 3 || /development|change|example|test/i.test(value.csrfSecret))
            throw new Error('Production CSRF secret is weak');
        if (!value.origin.startsWith('https://'))
            throw new Error('Production origin must use HTTPS');
        if (!/^re_[\w-]{20,}$/.test(value.resendKey) || zxcvbn(value.resendKey).score < 3 || value.emailFrom.includes('example.test'))
            throw new Error('Production email credentials and sending domain required');
    }
    return value;
}
export const config = loadConfig();
