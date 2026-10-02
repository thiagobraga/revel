import { pool } from './pool.js';
try {
    await pool.query('DELETE FROM sessions WHERE expires_at<now()');
    await pool.query('DELETE FROM password_reset_tokens WHERE expires_at<now()');
    await pool.query("DELETE FROM subscribers WHERE confirmed_at IS NULL AND created_at<now()-interval '7 days'");
}
finally {
    await pool.end();
}
