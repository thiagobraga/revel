import { connectRedis, closeRedis } from './db/redis.js';
import { pool } from './db/pool.js';
import { config } from './config.js';
import { logger } from './utils/securityLogger.js';
import { createHttpServer } from './server.js';
await connectRedis();
await pool.query('SELECT 1');
const { http, io } = createHttpServer();
http.listen(config.port, '0.0.0.0', () => logger.info({ port: config.port }, 'Revel API listening'));
async function shutdown() {
    await new Promise<void>(resolve => io.close(() => resolve()));
    await Promise.all([pool.end(), closeRedis()]);
}
for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
        void shutdown().then(() => process.exit(0));
    });
