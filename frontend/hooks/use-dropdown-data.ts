import { useApiQuery } from './use-api-query';
import { api } from '@/lib/api'
import { Grupo, Subgrupo } from '@/types'

interface DropdownOption {
  id: string
  codigo: string
  nome: string
  descricao: string
}

/**
 * Hook para buscar unidades de medida
 */
export function useUnidades() {
  return useApiQuery<DropdownOption[]>({
    queryKey: ['unidades'],
    queryFn: () => api.getUnidades(),
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

/**
 * Hook para buscar tipos de produto para dropdown
 */
export function useTiposProduto() {
  return useApiQuery<DropdownOption[]>({
    queryKey: ['tipos-produto'],
    queryFn: () => api.getTiposProduto(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para buscar tipos de item para dropdown
 */
export function useTiposItem() {
  return useApiQuery<DropdownOption[]>({
    queryKey: ['tipos-item'],
    queryFn: () => api.getTiposItem(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para buscar grupos para dropdown
 */
export function useGrupos() {
  return useApiQuery<DropdownOption[]>({
    queryKey: ['grupos'],
    queryFn: async () => {
      const grupos = await api.getGrupos();
      return grupos.map((grupo: Grupo) => ({
        id: grupo.id,
        codigo: grupo.codigo.toString(),
        nome: grupo.nome,
        descricao: grupo.descricao
      }));
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Hook para buscar subgrupos para dropdown
 */
export function useSubgrupos(grupoId?: string) {
  return useApiQuery<DropdownOption[]>({
    queryKey: ['subgrupos', grupoId],
    queryFn: async () => {
      const subgrupos = await api.getSubgrupos(grupoId);
      return subgrupos.map((subgrupo: Subgrupo) => ({
        id: subgrupo.id,
        codigo: subgrupo.codigo.toString(),
        nome: subgrupo.nome,
        descricao: subgrupo.descricao
      }));
    },
    enabled: !!grupoId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}