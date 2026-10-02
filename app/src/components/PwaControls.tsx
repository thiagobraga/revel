'use client';
import { useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';
import { request } from '../api/client';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { InstallEvent } from '../types/offline';
export function PwaControls() {
    const online = useOnlineStatus();
    const [install, setInstall] = useState<InstallEvent | null>(null);
    const [update, setUpdate] = useState(false);
    const [worker, setWorker] = useState<Workbox | null>(null);
    useEffect(() => {
        const prompt = (event: Event) => {
            event.preventDefault();
            setInstall(event as InstallEvent);
        };
        window.addEventListener('beforeinstallprompt', prompt);
        if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_COVERAGE !== 'true' && 'serviceWorker' in navigator) {
            const wb = new Workbox('/sw.js');
            wb.addEventListener('waiting', () => setUpdate(true));
            void wb.register();
            setWorker(wb);
        }
        return () => window.removeEventListener('beforeinstallprompt', prompt);
    }, []);
    useEffect(() => {
        let initial: string | undefined;
        const check = async () => {
            try {
                const data = await request<{
                    buildId: string;
                }>('/version');
                if (initial && data.buildId !== initial)
                    setUpdate(true);
                initial = data.buildId;
            }
            catch {
                // A disconnected tab keeps using its current build.
            }
        };
        void check();
        const timer = setInterval(() => {
            void check();
        }, 60000);
        return () => clearInterval(timer);
    }, []);
    if (!online)
        return <div className="pwa-notice" role="status">Offline</div>;
    if (update)
        return <div className="pwa-notice" role="status">Nova versão disponível.<button className="button" onClick={() => {
            worker?.messageSkipWaiting();
            location.reload();
        }}>Recarregar</button></div>;
    if (install)
        return <div className="pwa-notice"><button className="button" onClick={() => {
            void install.prompt().then(() => setInstall(null));
        }}>Instalar REVEL</button><button className="icon-button" onClick={() => setInstall(null)} aria-label="Fechar">×</button></div>;
    return null;
}
