'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Componente que fornece todos os providers necessários para a aplicação
 * Inclui QueryClient para TanStack Query e configurações de desenvolvimento
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Criar uma instância do QueryClient com configurações otimizadas
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo de cache padrão: 5 minutos
            staleTime: 1000 * 60 * 5,
            // Tempo para garbage collection: 10 minutos
            gcTime: 1000 * 60 * 10,
            // Retry automático em caso de erro
            retry: (failureCount, error: any) => {
              // Não retry para erros 4xx (client errors)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Máximo de 3 tentativas para outros erros
              return failureCount < 3;
            },
            // Intervalo entre retries (exponential backoff)
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch quando a janela ganha foco
            refetchOnWindowFocus: false,
            // Refetch quando reconecta à internet
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry para mutations em caso de erro de rede
            retry: (failureCount, error: any) => {
              // Não retry para erros 4xx
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
      {/* React Query Devtools - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}