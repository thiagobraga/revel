'use client';
import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../api/queryClient';
import { AuthProvider } from '../contexts/AuthContext';
import { usePreferences } from '../stores/preferences';
import type { ChildrenProps } from '../types/ui';
export function Providers({ children }: ChildrenProps) {
    const [query] = useState(createQueryClient);
    useEffect(() => {
        const theme = localStorage.getItem('revel-theme');
        const locale = localStorage.getItem('revel-locale');
        if (theme === 'light' || theme === 'dark')
            usePreferences.getState().setTheme(theme);
        if (locale === 'en' || locale === 'pt-BR')
            usePreferences.getState().setLocale(locale);
    }, []);
    return <QueryClientProvider client={query}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}
