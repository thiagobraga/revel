import { PublicSite } from '../components/PublicSite';
import type { ShowPage, SiteLinks } from '../types/domain';
export const dynamic = 'force-dynamic';
export default async function Home() {
    let initialShows: ShowPage = { items: [], nextCursor: null };
    let agendaUnavailable = false;
    try {
        const response = await fetch((process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000') + '/api/v1/shows', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        if (!response.ok)
            throw new Error('Agenda unavailable');
        initialShows = await response.json();
    }
    catch {
        agendaUnavailable = true;
    }
    const links: SiteLinks = { spotify: process.env.SPOTIFY_URL ?? '', bandcamp: process.env.BANDCAMP_URL ?? '', youtube: process.env.YOUTUBE_URL ?? '', instagram: process.env.INSTAGRAM_URL ?? '', contact: process.env.CONTACT_URL ?? '', petroleo: process.env.PETROLEO_URL ?? '' };
    return <PublicSite initialShows={initialShows} agendaUnavailable={agendaUnavailable} links={links}/>;
}
