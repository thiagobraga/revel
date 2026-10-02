'use client';
import { useState } from 'react';
import { request } from '../api/client';
import { AuthShell } from './AuthShell';
import { Field } from './ui/Field';
import { Button } from './ui/Button';
export function PasswordForm({ token }: {
    token?: string;
}) {
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    return <AuthShell><h1>{token ? 'Nova senha' : 'Recuperar acesso'}</h1><form onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            try {
                if (token)
                    await request('/auth/reset-password', { method: 'POST', body: { token, password: form.get('password') } });
                else
                    await request('/auth/forgot-password', { method: 'POST', body: { email: form.get('email') } });
                setMessage(token ? 'Senha alterada. Entre novamente.' : 'Se a conta existir, você receberá um link.');
            }
            catch (error) {
                setMessage(error instanceof Error ? error.message : 'Falha ao enviar');
            }
            finally {
                setBusy(false);
            }
        }}>{token ? <Field label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/> : <Field label="E-mail" name="email" type="email" autoComplete="email" required/>}<Button disabled={busy} type="submit">Enviar</Button><p role="status">{message}</p></form></AuthShell>;
}
