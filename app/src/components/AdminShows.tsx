'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { request } from '../api/client';
import { enqueue, listQueue, clearUserQueue } from '../utils/offlineQueue';
import { runOptimistic } from '../stores/optimistic';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from './AppShell';
import { Field } from './ui/Field';
import { Button } from './ui/Button';
import type { Show, ShowPage, ShowInput } from '../types/domain';
const schema = z.object({ title: z.string().trim().min(1).max(200), city: z.string().trim().min(1).max(200), venue: z.string().trim().min(1).max(200), startsAt: z.iso.datetime(), ticketUrl: z.url().refine(v => v.startsWith('https://')).nullable(), published: z.boolean() });
export function AdminShows() {
    const { user } = useAuth();
    const query = useQueryClient();
    const { data, error } = useQuery({ queryKey: ['shows', 'admin'], queryFn: () => request<ShowPage>('/admin/shows'), enabled: !!user });
    const [editing, setEditing] = useState<Show | null>(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState(0);
    useEffect(() => {
        if (user)
            void listQueue(user.id).then(items => setPending(items.length));
    }, [user, data]);
    const mutate = async (method: 'POST' | 'PATCH' | 'DELETE', path: string, body: Record<string, unknown>) => {
        if (!user)
            throw new Error('Sign in required');
        const key = crypto.randomUUID();
        const queue = async () => {
            await enqueue(user.id, { method, path, body }, key);
            setPending((await listQueue(user.id)).length);
            setMessage('Alteração salva neste dispositivo.');
        };
        if (!navigator.onLine) {
            await queue();
            return;
        }
        try {
            await request(path, { method, body: method === 'DELETE' ? undefined : body, idempotencyKey: key });
        }
        catch (error) {
            if (error instanceof TypeError || (error instanceof Error && 'status' in error && Number(error.status) >= 500)) {
                await queue();
                return;
            }
            throw error;
        }
        await query.invalidateQueries({ queryKey: ['shows'] });
    };
    return <AppShell><form key={editing?.id ?? 'new'} className="editor-form" onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            setBusy(true);
            setMessage('');
            try {
                const input: ShowInput = schema.parse({ title: values.get('title'), city: values.get('city'), venue: values.get('venue'), startsAt: new Date(String(values.get('startsAt'))).toISOString(), ticketUrl: values.get('ticketUrl') || null, published: values.get('published') === 'on' });
                await mutate(editing ? 'PATCH' : 'POST', editing ? '/shows/' + editing.id : '/shows', { ...input, ...(editing ? { version: editing.version } : {}) });
                form.reset();
                setEditing(null);
                setMessage(navigator.onLine ? 'Show salvo.' : 'Alteração salva neste dispositivo.');
            }
            catch (error) {
                setMessage(error instanceof Error ? error.message : 'Falha ao salvar.');
            }
            finally {
                setBusy(false);
            }
        }}><h2>{editing ? 'Editar show' : 'Novo show'}</h2><div className="form-grid"><Field label="Título" name="title" defaultValue={editing?.title} required maxLength={200}/><Field label="Cidade" name="city" defaultValue={editing?.city} required maxLength={200}/><Field label="Local" name="venue" defaultValue={editing?.venue} required maxLength={200}/><Field label="Data e hora" name="startsAt" type="datetime-local" defaultValue={editing ? new Date(new Date(editing.startsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined} required/><Field label="Link dos ingressos (HTTPS)" name="ticketUrl" type="url" defaultValue={editing?.ticketUrl ?? ''}/><label className="checkbox"><input type="checkbox" name="published" defaultChecked={editing?.published ?? false}/>Publicado na agenda</label></div><div className="actions"><Button disabled={busy} type="submit">{busy ? 'Salvando...' : 'Salvar show'}</Button>{editing ? <Button className="outline" type="button" onClick={() => setEditing(null)}>Cancelar</Button> : null}</div></form><p role="status">{message}</p>{error ? <p role="alert">{error.message}</p> : null}{pending ? <div className="notice"><p>{pending} alteração(ões) pendente(s).</p><Button className="outline" onClick={() => {
                if (user)
                    void clearUserQueue(user.id).then(() => {
                        setPending(0);
                        setMessage('Fila descartada. Recarregue os dados antes de editar.');
                    });
            }}>Descartar fila pendente</Button></div> : null}<div className="admin-show-list">{data?.items.map(show => <article className="agenda-row" key={show.id}><div><strong>{show.title}</strong><p>{show.city} / {show.venue}</p><time dateTime={show.startsAt}>{new Date(show.startsAt).toLocaleString('pt-BR')}</time><p className="mono">{show.published ? 'Publicado' : 'Rascunho'} / v{show.version}</p></div><div className="actions"><Button className="outline" onClick={() => setEditing(show)}>Editar</Button><Button className="outline" onClick={async () => {
                if (!confirm('Excluir este show?'))
                    return;
                const previous = query.getQueryData<ShowPage>(['shows', 'admin']);
                try {
                    await runOptimistic({ apply: () => query.setQueryData<ShowPage>(['shows', 'admin'], old => old ? { ...old, items: old.items.filter(i => i.id !== show.id) } : old), revert: () => query.setQueryData(['shows', 'admin'], previous), request: () => mutate('DELETE', '/shows/' + show.id + '?version=' + show.version, {}) });
                }
                catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Falha ao excluir');
                }
            }}>Excluir</Button></div></article>)}</div></AppShell>;
}
