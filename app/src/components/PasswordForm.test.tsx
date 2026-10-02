import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { PasswordForm } from './PasswordForm';
import { request } from '../api/client';
vi.mock('../api/client', () => ({ request: vi.fn() }));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
it('requests a non-enumerating reset link and reports failures', async () => {
    render(<PasswordForm />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@example.test' } });
    const form = screen.getByLabelText('E-mail').closest('form')!;
    vi.mocked(request).mockResolvedValueOnce({});
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Se a conta existir'));
    expect(request).toHaveBeenCalledWith('/auth/forgot-password', { method: 'POST', body: { email: 'admin@example.test' } });
    vi.mocked(request).mockRejectedValueOnce(new Error('Delivery unavailable'));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Delivery unavailable'));
    vi.mocked(request).mockRejectedValueOnce('failure');
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Falha ao enviar'));
});
it('submits a token and new password once', async () => {
    vi.mocked(request).mockResolvedValue({});
    render(<PasswordForm token="reset-token"/>);
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'A-strong-password!2026' } });
    fireEvent.submit(screen.getByLabelText('Nova senha').closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha alterada'));
    expect(request).toHaveBeenCalledWith('/auth/reset-password', { method: 'POST', body: { token: 'reset-token', password: 'A-strong-password!2026' } });
});
