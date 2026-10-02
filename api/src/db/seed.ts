import { config } from '../config.js';
import { pool } from './pool.js';
import { provisionUser } from '../services/authService.js';
if (config.nodeEnv === 'production')
    throw new Error('Seed is development-only');
try {
    const count = await pool.query('SELECT id FROM users LIMIT 1');
    if (!count.rowCount && process.env.DEV_ADMIN_EMAIL && process.env.DEV_ADMIN_PASSWORD)
        await provisionUser(process.env.DEV_ADMIN_EMAIL, process.env.DEV_ADMIN_PASSWORD);
}
finally {
    await pool.end();
}
