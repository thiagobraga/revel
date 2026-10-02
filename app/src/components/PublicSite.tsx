'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDown, Sun, Moon, Menu, X } from 'lucide-react';
import { usePreferences } from '../stores/preferences';
import { messages } from '../i18n';
import { request } from '../api/client';
import { Button } from './ui/Button';
import type { PublicSiteProps } from '../types/ui';
import type { ShowPage } from '../types/domain';
export function PublicSite({ initialShows, agendaUnavailable, links }: PublicSiteProps) {
    const { theme, locale, setTheme, setLocale } = usePreferences();
    const t = messages[locale];
    const [menu, setMenu] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const [notice, setNotice] = useState('');
    const [sending, setSending] = useState(false);
    const { data: shows = initialShows } = useQuery({ queryKey: ['shows', 'public'], queryFn: () => request<ShowPage>('/shows'), initialData: initialShows, refetchInterval: 60000 });
    useEffect(() => {
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenu(false);
                menuButton.current?.focus();
            }
        };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, []);
    const link = (url: string, label: string, primary = false) => url ? <a className={'button ' + (primary ? '' : 'outline')} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16}/></a> : <button className={'button ' + (primary ? '' : 'outline')} aria-disabled="true" onClick={() => setNotice(t.linksPending)}>{label}<ArrowUpRight size={16}/></button>;
    return <><header className="site-header wrap"><a href="#main" aria-label="REVEL"><img className="logo" src={theme === 'dark' ? '/brand/revel-white.png' : '/brand/revel-black.png'} width="180" height="58" alt="REVEL"/></a><nav id="mobile-navigation" className={menu ? 'navigation open' : 'navigation'} aria-label="Principal">{(['music', 'manifesto', 'agenda', 'merch'] as const).map(key => <a key={key} href={'#' + key} onClick={() => setMenu(false)}>{t[key]}</a>)}</nav><div className="header-controls"><a className="button outline contact" href="#contact">{t.contact}</a><button className="icon-button" aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} aria-pressed={theme === 'light'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button><button className="locale-button" onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')} aria-label="Idioma / Language">{locale === 'pt-BR' ? 'EN' : 'PT'}</button><button ref={menuButton} className="icon-button mobile-menu" aria-expanded={menu} aria-controls="mobile-navigation" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div></header>
 <main id="main"><section className="hero"><div className="hero-content wrap"><p className="mono hero-label">REVEL / HARDCORE · CRUST</p><h1>Estrada<br />Perdida</h1><p className="hero-tagline">{t.tagline}</p><div className="actions">{link(links.spotify, t.listen, true)}<a className="button outline" href="#music">{t.explore}<ArrowDown size={16}/></a></div></div><img className="hero-art decorative" src="/visuals/hero-collage-dark.webp" width="412" height="482" alt="" fetchPriority="high"/><img className="hero-road decorative" src="/visuals/road-divider-dark.webp" width="724" height="110" alt=""/><div className="platform-rail wrap"><div><span>{t.listenOn}</span>{(['spotify', 'bandcamp', 'youtube'] as const).map((key, index) => <span key={key}>{index > 0 ? <span aria-hidden="true"> / </span> : null}{links[key] ? <a href={links[key]} target="_blank" rel="noopener noreferrer">{key}</a> : <span>{key}</span>}</span>)}</div><span>01 / ESTRADA PERDIDA</span></div></section>
 <section id="music" className="music-section wrap"><p className="section-label">01 / {t.music}</p><div className="release-grid"><img className="album-cover" src="/artwork/estrada-perdida-original.jpg" width="1080" height="1080" alt="Capa original de Estrada Perdida" loading="lazy"/><div className="release-copy"><h2>Estrada Perdida</h2><p className="mono">{t.album}</p><p className="body-copy">{t.release}</p><div className="release-row"><span>Estrada Perdida</span>{link(links.spotify, t.listenAlbum)}</div><div className="release-row"><span>Petróleo</span>{link(links.petroleo, t.single)}</div></div></div></section>
 <div className="road-break"><img className="decorative" src="/visuals/road-divider-dark.webp" width="724" height="110" alt="" loading="lazy"/></div>
 <section id="manifesto" className="manifesto-section"><div className="wrap"><p className="section-label">02 / {t.manifesto}</p><div className="manifesto-grid"><h2>{t.manifestoTitle.split('\n').map(line => <span key={line}>{line}</span>)}</h2><div className="manifesto-copy"><p>{t.manifestoBody}</p><strong>{t.manifestoEnd}</strong></div></div></div><img className="factory decorative" src="/visuals/manifesto-factory-dark.webp" width="724" height="150" alt="" loading="lazy"/></section>
 <section id="agenda" className="agenda-section wrap"><p className="section-label">03 / {t.agenda}</p><div className="section-heading"><h2>{t.agendaTitle}</h2><span className="mono">{t.nextShows}</span></div>{shows.items.length ? shows.items.map(show => <div className="agenda-row" key={show.id}><time dateTime={show.startsAt}>{new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(show.startsAt))}</time><div><strong>{show.title}</strong><span>{show.city} / {show.venue}</span></div>{show.ticketUrl ? link(show.ticketUrl, t.tickets) : null}</div>) : <><div className="agenda-row"><span className="mono">{t.soon}</span><p>{agendaUnavailable ? t.unavailable : t.newDates}</p>{link(links.instagram, t.follow)}</div><div className="agenda-row"><span className="mono">{t.soon}</span><p>{t.booking}</p>{link(links.contact, t.talk)}</div></>}</section>
 <section id="merch" className="merch-section wrap"><p className="section-label">04 / {t.merch}</p><div className="section-heading"><h2>{t.merchTitle}</h2><a href="#contact" className="button outline">{t.seeMerch}<ArrowUpRight size={16}/></a></div><div className="merch-grid">{[{ image: 'merch-revel-shirt-light', title: t.blackShirt }, { image: 'merch-estrada-shirt-light', title: t.whiteShirt }, { image: 'merch-estrada-vinyl-light', title: t.vinyl }].map(item => <figure key={item.image}><img src={'/visuals/' + item.image + '.webp'} width="240" height="210" alt={item.title} loading="lazy"/><figcaption><strong>{item.title}</strong><span className="mono">{t.concept}</span></figcaption></figure>)}</div></section>
 </main><footer id="contact" className="petroleo-footer"><section className="petroleo-feature wrap"><img className="footer-art decorative" src="/visuals/petroleo-footer-art-dark.webp" width="724" height="290" alt="" loading="lazy"/><div><h2>Petróleo.</h2><p className="mono">{t.petroleoTag}</p>{link(links.petroleo, t.single)}</div></section><div className="footer-main wrap"><div><img className="footer-logo" src={theme === 'dark' ? '/brand/revel-black.png' : '/brand/revel-white.png'} width="300" height="95" alt="REVEL"/><p className="mono">{t.independent}</p></div><form onSubmit={async (event) => {
            event.preventDefault();
            setSending(true);
            setNotice('');
            const form = new FormData(event.currentTarget);
            try {
                await request('/newsletter', { method: 'POST', body: { email: form.get('email') } });
                setNotice(t.newsletterSuccess);
            }
            catch (error) {
                setNotice(error instanceof Error ? error.message : 'Erro');
            }
            finally {
                setSending(false);
            }
        }}><h3>{t.newsletter}</h3><label className="sr-only" htmlFor="newsletter-email">{t.email}</label><div className="newsletter-input"><input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder={t.email} required maxLength={254}/><Button disabled={sending} type="submit">{sending ? t.sending : t.subscribe}<ArrowUpRight size={16}/></Button></div><p className="consent">{t.consent}</p></form></div><div className="footer-utilities wrap"><div>{links.instagram ? <a href={links.instagram}>Instagram</a> : <span>Instagram</span>}{links.youtube ? <a href={links.youtube}>YouTube</a> : <span>YouTube</span>}{links.contact ? <a href={links.contact}>{t.contact}</a> : <span>{t.contact}</span>}</div><span>© {new Date().getFullYear()} REVEL</span></div></footer>{notice ? <div className="toast" role="status">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Fechar"><X size={18}/></button></div> : null}</>;
}
