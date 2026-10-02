import { PasswordForm } from '../../components/PasswordForm';
export default async function ResetPage({ searchParams }: {
    searchParams: Promise<{
        token?: string;
    }>;
}) {
    const { token } = await searchParams;
    return <PasswordForm token={token}/>;
}
