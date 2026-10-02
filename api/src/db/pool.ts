import pg from 'pg';
import { config } from '../config.js';
export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 20, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
