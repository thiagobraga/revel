import { createClient } from 'redis';
import { config } from '../config.js';
import { logger } from '../utils/securityLogger.js';
export const redis = createClient({ url: config.redisUrl });
export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();
for (const client of [redis, redisPub, redisSub])
    client.on('error', err => logger.error({ err }, 'Redis error'));
export async function connectRedis() {
    await Promise.all([redis, redisPub, redisSub].filter(c => !c.isOpen).map(c => c.connect()));
}
export async function closeRedis() {
    await Promise.all([redis, redisPub, redisSub].filter(c => c.isOpen).map(c => c.close()));
}
