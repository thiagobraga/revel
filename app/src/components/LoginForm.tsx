'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { AuthShell } from './AuthShell';
import { Field } from './ui/Field';
import { Button } from './ui/Button';
export function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    return <AuthShell><h1>Administração</h1><form onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError('');
            try {
                await login(String(form.get('email')), String(form.get('password')));
                router.push('/admin');
            }
            catch (error) {
                setError(error instanceof Error ? error.message : 'Falha ao entrar');
            }
            finally {
                setBusy(false);
            }
        }}><Field name="email" label="E-mail" type="email" autoComplete="username" required/><Field name="password" label="Senha" type="password" autoComplete="current-password" required maxLength={128}/><Button disabled={busy} type="submit">{busy ? 'Entrando...' : 'Entrar'}</Button><p role="alert">{error}</p></form><Link href="/forgot-password">Esqueci minha senha</Link></AuthShell>;
}
