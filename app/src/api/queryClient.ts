import { QueryClient } from '@tanstack/react-query';
export const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: 1, gcTime: 86400000 }, mutations: { retry: 0 } } });
