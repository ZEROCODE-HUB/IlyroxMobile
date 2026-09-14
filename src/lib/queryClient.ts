import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
