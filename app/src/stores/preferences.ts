import { create } from 'zustand';
import type { PreferenceState } from '../types/ui';
export const usePreferences = create<PreferenceState>(set => ({ theme: 'dark', locale: 'pt-BR', setTheme: theme => {
        set({ theme });
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('revel-theme', theme);
    }, setLocale: locale => {
        set({ locale });
        document.documentElement.lang = locale;
        localStorage.setItem('revel-locale', locale);
    } }));
