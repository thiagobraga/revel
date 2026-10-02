import Link from 'next/link';
export default async function ConfirmPage({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) {
    const { token } = await searchParams;
    let message = 'Link inválido.';
    if (token) {
        try {
            const response = await fetch((process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000') + '/api/v1/newsletter/confirm?token=' + encodeURIComponent(token), { cache: 'no-store' });
            message = response.ok ? 'Inscrição confirmada.' : 'Link inválido ou expirado.';
        }
        catch {
            message = 'Não foi possível confirmar agora. Tente novamente.';
        }
    }
    return <main className="auth-shell"><h1>{message}</h1><Link href="/">Voltar à REVEL</Link></main>;
}
