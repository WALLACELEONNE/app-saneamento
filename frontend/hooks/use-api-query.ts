import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Hook personalizado que estende useQuery com cancelamento automático
 * Integra com a classe ApiClient para cancelamento adequado de requisições
 */
export function useApiQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    queryKey: readonly unknown[];
    queryFn: () => Promise<TData>;
    requestKey?: string;
  }
): UseQueryResult<TData, TError> {
  const requestKeyRef = useRef<string | null>(null);

  // Wrapper da queryFn para incluir requestKey
  const wrappedQueryFn = async (): Promise<TData> => {
    // Cancelar requisição anterior se existir
    if (requestKeyRef.current) {
      api.cancelRequest(requestKeyRef.current);
    }

    // Gerar chave única para esta requisição
    const queryKeyString = JSON.stringify(options.queryKey);
    requestKeyRef.current = options.requestKey || `query-${queryKeyString}-${Date.now()}-${Math.random()}`;

    try {
      // Executar a query original
      const result = await options.queryFn();
      return result;
    } catch (error: any) {
      // Se foi cancelado, não propagar o erro como falha
      if (error.message === 'Requisição cancelada') {
        throw new Error('Query cancelled');
      }
      throw error;
    }
  };

  const query = useQuery({
    ...options,
    queryFn: wrappedQueryFn,
    // Configurações específicas para evitar requests desnecessários
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    staleTime: options.staleTime ?? 1000 * 60 * 5, // 5 minutos
    gcTime: options.gcTime ?? 1000 * 60 * 10, // 10 minutos
  });

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (requestKeyRef.current) {
        api.cancelRequest(requestKeyRef.current);
      }
    };
  }, []);

  // Cleanup quando a query key muda
  useEffect(() => {
    return () => {
      if (requestKeyRef.current) {
        api.cancelRequest(requestKeyRef.current);
      }
    };
  }, [JSON.stringify(options.queryKey)]);

  return query;
}

/**
 * Hook para queries que precisam ser canceladas manualmente
 * Retorna uma função cancelQuery para cancelamento manual
 */
export function useApiQueryWithCancel<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    queryKey: readonly unknown[];
    queryFn: () => Promise<TData>;
    requestKey?: string;
  }
) {
  const requestKeyRef = useRef<string | null>(null);

  const wrappedQueryFn = async (): Promise<TData> => {
    if (requestKeyRef.current) {
      api.cancelRequest(requestKeyRef.current);
    }

    const queryKeyString = JSON.stringify(options.queryKey);
    requestKeyRef.current = options.requestKey || `query-${queryKeyString}-${Date.now()}-${Math.random()}`;

    try {
      const result = await options.queryFn();
      return result;
    } catch (error: any) {
      if (error.message === 'Requisição cancelada') {
        throw new Error('Query cancelled');
      }
      throw error;
    }
  };

  const query = useQuery({
    ...options,
    queryFn: wrappedQueryFn,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 10,
  });

  // Função para cancelar manualmente
  const cancelQuery = () => {
    if (requestKeyRef.current) {
      api.cancelRequest(requestKeyRef.current);
    }
  };

  // Cleanup automático
  useEffect(() => {
    return () => {
      if (requestKeyRef.current) {
        api.cancelRequest(requestKeyRef.current);
      }
    };
  }, []);

  return {
    ...query,
    cancelQuery,
  };
}

/**
 * Hook especializado para queries que usam diretamente métodos da ApiClient
 * Integra automaticamente com o sistema de requestKey da ApiClient
 */
export function useApiClientQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    queryKey: readonly unknown[];
    queryFn: (requestKey: string) => Promise<TData>;
  }
): UseQueryResult<TData, TError> {
  const requestKeyRef = useRef<string | null>(null);

  const wrappedQueryFn = async (): Promise<TData> => {
    // Cancelar requisição anterior se existir
    if (requestKeyRef.current) {
      api.cancelRequest(requestKeyRef.current);
    }

    // Gerar chave única para esta requisição
    const queryKeyString = JSON.stringify(options.queryKey);
    requestKeyRef.current = `query-${queryKeyString}-${Date.now()}-${Math.random()}`;

    try {
      // Executar a query passando o requestKey
      const result = await options.queryFn(requestKeyRef.current);
      return result;
    } catch (error: any) {
      if (error.message === 'Requisição cancelada') {
        throw new Error('Query cancelled');
      }
      throw error;
    }
  };

  const query = useQuery({
    ...options,
    queryFn: wrappedQueryFn,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 10,
  });

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (requestKeyRef.current) {
        api.cancelRequest(requestKeyRef.current);
      }
    };
  }, []);

  return query;
}