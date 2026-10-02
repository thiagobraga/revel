import { z } from 'zod';
import { provisionUser } from '../services/authService.js';
import { pool } from './pool.js';
const [email, password, role = 'admin'] = process.argv.slice(2);
try {
    const user = await provisionUser(z.email().parse(email), z.string().parse(password), z.enum(['admin', 'editor']).parse(role));
    console.log('Provisioned ' + user.email);
}
finally {
    await pool.end();
}
