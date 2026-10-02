import type { ReactNode } from 'react';
import type { Preferences, SiteLinks, ShowPage } from './domain';
export interface ChildrenProps {
    children: ReactNode;
}
export interface PublicSiteProps {
    initialShows: ShowPage;
    agendaUnavailable: boolean;
    links: SiteLinks;
}
export interface PreferenceState extends Preferences {
    setTheme: (theme: Preferences['theme']) => void;
    setLocale: (locale: Preferences['locale']) => void;
}
export interface OptimisticOperation<T> {
    apply: () => void;
    revert: () => void;
    request: () => Promise<T>;
}
