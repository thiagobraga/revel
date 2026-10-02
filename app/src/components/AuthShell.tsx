import Link from 'next/link';
import type { ChildrenProps } from '../types/ui';
export function AuthShell({ children }: ChildrenProps) {
    return <main className="auth-shell"><Link href="/" className="brand"><img src="/brand/revel-white.png" width="180" height="58" alt="REVEL"/></Link>{children}<Link href="/">Voltar ao site</Link></main>;
}
