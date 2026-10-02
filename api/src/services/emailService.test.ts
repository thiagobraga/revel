import { it, expect, vi } from 'vitest';
import { Resend } from 'resend';
import { config } from '../config.js';
import { sendEmail } from './emailService.js';
it('fails loudly on provider rejection and sends the expected safe reset link', async () => {
    const original = config.resendKey;
    config.resendKey = 're_test';
    const send = vi.spyOn(new Resend('re_test').emails.constructor.prototype, 'send');
    try {
        send.mockResolvedValue({ data: { id: 'sent' }, error: null });
        await sendEmail('test@example.test', 'Reset', 'https://revel.test/reset-password?token=token');
        expect(send).toHaveBeenCalled();
        send.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'invalid', statusCode: 400 } });
        await expect(sendEmail('test@example.test', 'Reset', 'https://revel.test')).rejects.toThrow('delivery failed');
    }
    finally {
        send.mockRestore();
        config.resendKey = original;
    }
});
