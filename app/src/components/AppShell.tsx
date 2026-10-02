'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineQueueReplay } from '../hooks/useOfflineQueueReplay';
import type { ChildrenProps } from '../types/ui';
export function AppShell({ children }: ChildrenProps) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const { online, message } = useOfflineQueueReplay();
    useEffect(() => {
        if (!loading && !user)
            router.replace('/login');
    }, [user, loading, router]);
    if (loading || !user)
        return <main className="shell" aria-busy="true">Carregando...</main>;
    return <main className="shell"><header className="admin-header"><Link href="/">REVEL</Link><h1>Agenda</h1><button className="button outline" onClick={() => {
        void logout().then(() => router.push('/login'));
    }}>Sair</button></header>{!online ? <p role="status" className="notice">Offline. Alterações serão enviadas ao reconectar.</p> : null}{message ? <p role="status">{message}</p> : null}{children}</main>;
}
