'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiQueries } from '@/lib/api';
import { objectToQueryString } from '@/lib/utils';
import type { FormFilters } from '@/types';

/**
 * Schema de validação para o formulário de filtros
 */
const filtersSchema = z.object({
  empresa_id: z.string().min(1, 'Selecione uma empresa'),
  grupo_id: z.string().optional(),
  subgrupo_id: z.string().optional(),
  material_id: z.string().optional(),
  apenas_divergentes: z.boolean().default(false),
  saldos_positivos_siagri: z.boolean().default(false),
  saldos_positivos_cigam: z.boolean().default(false),
});

/**
 * Componente de formulário para filtros de estoque
 * Permite selecionar empresa, grupo, subgrupo, material e opções adicionais
 */
export function FiltersForm() {
  const router = useRouter();
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string>('');

  // Configuração do formulário
  const form = useForm<FormFilters>({
    resolver: zodResolver(filtersSchema),
    defaultValues: {
      empresa_id: '',
      grupo_id: '',
      subgrupo_id: '',
      material_id: '',
      apenas_divergentes: false,
      saldos_positivos_siagri: false,
      saldos_positivos_cigam: false,
    },
  });

  // Queries para buscar dados dos filtros
  const { data: empresasRaw = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: apiQueries.keys.empresas,
    queryFn: apiQueries.empresas,
  });

  // Mapeia os dados da API para o formato esperado pelo frontend
  const empresas = empresasRaw.map((empresa: any) => ({
    id: empresa.codigo?.toString() || '',
    nome: empresa.nome || '',
    codigo: empresa.codigo?.toString() || '',
    ativa: true
  }));

  const { data: gruposRaw = [], isLoading: loadingGrupos } = useQuery({
    queryKey: apiQueries.keys.grupos(),
    queryFn: () => apiQueries.grupos(),
    // Grupos não dependem da empresa selecionada
  });

  // Mapeia os dados dos grupos da API para o formato esperado pelo frontend
  const grupos = gruposRaw.map((grupo: any) => ({
    id: grupo.codigo?.toString() || '',
    nome: grupo.descricao || '',
    codigo: grupo.codigo?.toString() || ''
  }));

  const { data: subgruposRaw = [], isLoading: loadingSubgrupos } = useQuery({
    queryKey: apiQueries.keys.subgrupos(selectedGrupo),
    queryFn: () => apiQueries.subgrupos(selectedGrupo),
    enabled: !!selectedGrupo,
  });

  // Mapeia os dados dos subgrupos da API para o formato esperado pelo frontend
  const subgrupos = subgruposRaw.map((subgrupo: any) => ({
    id: subgrupo.codigo?.toString() || '',
    nome: subgrupo.descricao || '',
    codigo: subgrupo.codigo?.toString() || '',
    grupo_id: selectedGrupo || ''
  }));

  const { data: materiaisRaw = [], isLoading: loadingMateriais } = useQuery({
    queryKey: apiQueries.keys.materiais({
      empresa_id: selectedEmpresa,
      grupo_id: selectedGrupo,
      subgrupo_id: selectedSubgrupo,
    }),
    queryFn: () => apiQueries.materiais({
      empresa_id: selectedEmpresa,
      grupo_id: selectedGrupo,
      subgrupo_id: selectedSubgrupo,
    }),
    enabled: !!selectedEmpresa,
  });

  // Mapeia os dados dos materiais da API para o formato esperado pelo frontend
  const materiais = materiaisRaw.map((material: any) => ({
    id: material.codigo?.toString() || '',
    nome: material.descricao || '',
    codigo: material.codigo?.toString() || '',
    grupo_id: selectedGrupo || '',
    subgrupo_id: selectedSubgrupo || '',
    ativo: true
  }));

  // Efeitos para limpar campos dependentes
  useEffect(() => {
    if (selectedEmpresa) {
      form.setValue('grupo_id', '');
      form.setValue('subgrupo_id', '');
      form.setValue('material_id', '');
      setSelectedGrupo('');
      setSelectedSubgrupo('');
    }
  }, [selectedEmpresa, form]);

  useEffect(() => {
    if (selectedGrupo) {
      form.setValue('subgrupo_id', '');
      form.setValue('material_id', '');
      setSelectedSubgrupo('');
    }
  }, [selectedGrupo, form]);

  useEffect(() => {
    if (selectedSubgrupo) {
      form.setValue('material_id', '');
    }
  }, [selectedSubgrupo, form]);

  /**
   * Manipula o envio do formulário
   */
  const onSubmit = (data: FormFilters) => {
    // Remove campos vazios
    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Navega para a página de resultados com os filtros
    const queryString = objectToQueryString(filteredData);
    router.push(`/results?${queryString}`);
  };

  /**
   * Limpa todos os filtros
   */
  const clearFilters = () => {
    form.reset();
    setSelectedEmpresa('');
    setSelectedGrupo('');
    setSelectedSubgrupo('');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Seleção de Empresa */}
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedEmpresa(value);
                  }}
                  value={field.value}
                  disabled={loadingEmpresas}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empresas
                      .filter((empresa) => empresa.id && empresa.id.trim() !== '')
                      .map((empresa) => (
                        <SelectItem key={`empresa-${empresa.id}`} value={empresa.id}>
                          {empresa.codigo} - {empresa.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Selecione a empresa para consultar o estoque
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seleção de Grupo */}
          <FormField
            control={form.control}
            name="grupo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedGrupo(value);
                  }}
                  value={field.value || undefined}
                  disabled={!selectedEmpresa || loadingGrupos}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os grupos" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {grupos
                      .filter((grupo) => grupo.id && grupo.id.trim() !== '')
                      .map((grupo) => (
                        <SelectItem key={`grupo-${grupo.id}`} value={grupo.id}>
                          {grupo.codigo} - {grupo.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Filtre por grupo de materiais (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seleção de Subgrupo */}
          <FormField
            control={form.control}
            name="subgrupo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subgrupo</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedSubgrupo(value);
                  }}
                  value={field.value || undefined}
                  disabled={!selectedGrupo || loadingSubgrupos}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os subgrupos" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subgrupos
                      .filter((subgrupo) => subgrupo.id && subgrupo.id.trim() !== '')
                      .map((subgrupo) => (
                        <SelectItem key={`subgrupo-${subgrupo.id}`} value={subgrupo.id}>
                          {subgrupo.codigo} - {subgrupo.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Filtre por subgrupo de materiais (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Seleção de Produto */}
          <FormField
            control={form.control}
            name="material_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={!selectedEmpresa || loadingMateriais}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os materiais" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {materiais
                      .filter((material) => material.id && material.id.trim() !== '')
                      .map((material) => (
                        <SelectItem key={`material-${material.id}`} value={material.id}>
                          {material.codigo} - {material.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Filtre por material específico (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Opções adicionais */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="apenas_divergentes"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Mostrar apenas itens com divergências
                  </FormLabel>
                  <FormDescription>
                    Exibe somente materiais com diferenças entre SIAGRI e CIGAM
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="saldos_positivos_siagri"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Mostrar apenas saldos positivos SIAGRI
                  </FormLabel>
                  <FormDescription>
                    Exibe somente materiais com saldo maior que zero no SIAGRI
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="saldos_positivos_cigam"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Mostrar apenas saldos positivos CIGAM
                  </FormLabel>
                  <FormDescription>
                    Exibe somente materiais com saldo maior que zero no CIGAM
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Botões de ação */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            className="min-w-[140px]"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Consultar Saldos
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={form.formState.isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </form>
    </Form>
  );
}