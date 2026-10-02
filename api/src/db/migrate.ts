import { migrate } from './runMigrations.js';
import { pool } from './pool.js';
try {
    await migrate();
}
finally {
    await pool.end();
}
