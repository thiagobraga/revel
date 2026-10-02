import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { User } from '../types/domain';
import { AppShell } from './AppShell';
import { AuthShell } from './AuthShell';
import { LoginForm } from './LoginForm';
import { Providers } from './Providers';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
const state = vi.hoisted(() => ({ user: null as User | null, loading: false, login: vi.fn(), logout: vi.fn(), push: vi.fn(), replace: vi.fn(), online: true, message: '' }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => state, AuthProvider: ({ children }: {
        children: import('react').ReactNode;
    }) => children }));
vi.mock('next/navigation', () => ({ useRouter: () => state }));
vi.mock('../hooks/useOfflineQueueReplay', () => ({ useOfflineQueueReplay: () => state }));
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.assign(state, { user: null, loading: false, online: true, message: '' });
    state.login.mockResolvedValue(undefined);
    state.logout.mockResolvedValue(undefined);
});
afterEach(cleanup);
it('guards a private shell until identity resolves and exposes offline status/logout', async () => {
    state.loading = true;
    const view = render(<AppShell>Editor</AppShell>);
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(state.replace).not.toHaveBeenCalled();
    state.loading = false;
    view.rerender(<AppShell>Editor</AppShell>);
    expect(state.replace).toHaveBeenCalledWith('/login');
    state.user = { id: 'user', email: 'admin@example.test', role: 'admin' };
    state.online = false;
    state.message = 'Conflict';
    view.rerender(<AppShell>Editor</AppShell>);
    expect(screen.getByText('Conflict')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/login'));
    state.online = true;
    state.message = '';
    view.rerender(<AppShell>Editor</AppShell>);
    expect(screen.queryByRole('status')).toBeNull();
});
it('submits login and reports concrete or generic failures', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@example.test' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password' } });
    const form = screen.getByLabelText('Senha').closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/admin'));
    expect(state.login).toHaveBeenCalledWith('admin@example.test', 'password');
    state.login.mockRejectedValueOnce(new Error('Denied'));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Denied'));
    state.login.mockRejectedValueOnce('denied');
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha ao entrar'));
});
it('hydrates only valid preferences and composes accessible primitives', () => {
    localStorage.setItem('revel-theme', 'light');
    localStorage.setItem('revel-locale', 'en');
    render(<Providers><AuthShell><Button className="outline">Action</Button><Field id="explicit" name="field" label="Field"/></AuthShell></Providers>);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByLabelText('Field')).toHaveAttribute('id', 'explicit');
    expect(screen.getByRole('button', { name: 'Action' })).toHaveClass('outline');
    cleanup();
    localStorage.setItem('revel-theme', 'invalid');
    localStorage.setItem('revel-locale', 'invalid');
    render(<Providers>Child</Providers>);
    expect(screen.getByText('Child')).toBeVisible();
});
it('renders a recoverable error boundary and forwards ordinary children', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {
    });
    const reload = vi.spyOn(location, 'reload').mockImplementation(() => {
    });
    const Crash = () => {
        throw new Error('render failure');
    };
    render(<ErrorBoundary><Crash /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(reload).toHaveBeenCalledOnce();
    cleanup();
    render(<ErrorBoundary>Safe content</ErrorBoundary>);
    expect(screen.getByText('Safe content')).toBeVisible();
    reload.mockRestore();
    log.mockRestore();
});
