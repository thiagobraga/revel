import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Providers } from '../components/Providers';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PwaControls } from '../components/PwaControls';
import type { ChildrenProps } from '../types/ui';
import './globals.css';
export async function generateMetadata(): Promise<Metadata> {
    const url = process.env.SITE_URL;
    return { title: 'REVEL | Estrada Perdida', description: 'Hardcore e crust. Ruído, concreto e resistência.', ...(url ? { metadataBase: new URL(url) } : {}), manifest: process.env.NODE_ENV === 'production' ? '/manifest.webmanifest' : '/manifest.dev.webmanifest', appleWebApp: { capable: true, title: 'REVEL', statusBarStyle: 'black-translucent' }, icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' }, openGraph: { title: 'REVEL | Estrada Perdida', description: 'Ruído, concreto e resistência.', images: ['/artwork/estrada-perdida-original.jpg'], type: 'website' }, robots: { index: true, follow: true } };
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#111111' };
export default async function RootLayout({ children }: ChildrenProps) {
    const nonce = (await headers()).get('x-nonce') ?? undefined;
    return <html lang="pt-BR" data-theme="dark" suppressHydrationWarning><head><link rel="apple-touch-startup-image" href="/splash/750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"/><link rel="apple-touch-startup-image" href="/splash/1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"/><script nonce={nonce} dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('revel-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}" }}/></head><body><a className="skip-link" href="#main">Pular para o conteúdo</a><Providers><ErrorBoundary>{children}</ErrorBoundary><PwaControls /></Providers></body></html>;
}
