import { randomBytes } from 'node:crypto';
import { pool } from '../db/pool.js';
import { digest } from './authService.js';
import { sendEmail } from './emailService.js';
import { config } from '../config.js';
import { publishEvent } from './syncService.js';
import { AppError } from '../utils/AppError.js';
export async function subscribe(email: string) {
    const token = randomBytes(32).toString('base64url');
    const result = await pool.query<{
        id: string;
    }>('INSERT INTO subscribers(email,token_hash) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET token_hash=$2 RETURNING id', [email.toLowerCase(), digest(token)]);
    const id = result.rows[0]!.id;
    publishEvent({ entityType: 'subscriber', eventType: 'created', entityId: id, userId: id });
    await sendEmail(email, 'Confirm your Revel subscription', config.origin + '/newsletter/confirm?token=' + token);
}
export async function confirmSubscription(token: string) {
    const result = await pool.query<{
        id: string;
    }>('UPDATE subscribers SET confirmed_at=now() WHERE token_hash=$1 RETURNING id', [digest(token)]);
    if (!result.rows[0])
        throw new AppError(422, 'INVALID_TOKEN', 'Subscription link is invalid');
    const id = result.rows[0].id;
    publishEvent({ entityType: 'subscriber', eventType: 'updated', entityId: id, userId: id });
    return id;
}
export async function unsubscribe(token: string) {
    const result = await pool.query<{
        id: string;
    }>('DELETE FROM subscribers WHERE token_hash=$1 RETURNING id', [digest(token)]);
    if (result.rows[0])
        publishEvent({ entityType: 'subscriber', eventType: 'deleted', entityId: result.rows[0].id, userId: result.rows[0].id });
}
