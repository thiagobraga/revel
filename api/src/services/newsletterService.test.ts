import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {pool} from '../db/pool.js';
import {migrate} from '../db/runMigrations.js';
import {subscribe,confirmSubscription,unsubscribe} from './newsletterService.js';
import {digest,forgotPassword,provisionUser} from './authService.js';
beforeAll(migrate);beforeEach(async()=>{await pool.query('TRUNCATE subscribers,users CASCADE');});afterAll(()=>pool.end());
it('requires confirmation, supports re-request and deletes subscribers',async()=>{
 await subscribe('listener@example.test');await subscribe('listener@example.test');const rows=await pool.query('SELECT * FROM subscribers');expect(rows.rows).toHaveLength(1);expect(rows.rows[0].confirmed_at).toBeNull();
 await pool.query('UPDATE subscribers SET token_hash=$1',[digest('confirmation-token-123456789')]);await confirmSubscription('confirmation-token-123456789');await expect(confirmSubscription('invalid')).rejects.toMatchObject({code:'INVALID_TOKEN'});await unsubscribe('confirmation-token-123456789');await unsubscribe('already-deleted');expect((await pool.query('SELECT * FROM subscribers')).rowCount).toBe(0);
});
it('creates an expiring hashed reset link and sends development email',async()=>{const user=await provisionUser('reset@example.test','Revel-test-6w#Q9!Fz2026');await forgotPassword(user.email);expect((await pool.query('SELECT * FROM password_reset_tokens')).rowCount).toBe(1);});
