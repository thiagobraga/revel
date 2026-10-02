import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from '../utils/securityLogger.js';
export async function sendEmail(to: string, subject: string, link: string) {
    if (!config.resendKey) {
        logger.info({ to, subject, link }, 'Development email');
        return;
    }
    const { error } = await new Resend(config.resendKey).emails.send({ from: config.emailFrom, to, subject, text: subject + '\n\n' + link + '\n\nIf you did not request this, ignore this message.' });
    if (error)
        throw new Error('Email delivery failed');
}
