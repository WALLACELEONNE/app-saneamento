'use client';

import { useApiQuery } from '@/hooks/use-api-query';
import { FiltersForm } from '@/components/filters/filters-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Package, Filter, Loader2, Database } from 'lucide-react';
import { api, apiQueries } from '@/lib/api';
import { Statistics, HealthCheck } from '@/types';

// export const metadata: Metadata = {
//   title: 'Filtros de Estoque',
//   description: 'Configure os filtros para consultar o estoque de materiais',
// };

/**
 * Página inicial da aplicação com formulário de filtros
 * Permite ao usuário selecionar empresa, grupo, subgrupo e material
 * para consultar os saldos comparativos entre SIAGRI e CIGAM
 */
export default function HomePage() {
  // Busca estatísticas reais do sistema
  const { data: stats, isLoading, error } = useApiQuery<Statistics>({
    queryKey: apiQueries.keys.statistics,
    queryFn: () => apiQueries.statistics(),
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });

  // Busca status de saúde do sistema
  const { data: healthStatus, isLoading: healthLoading, error: healthError } = useApiQuery<HealthCheck>({
    queryKey: apiQueries.keys.healthCheck,
    queryFn: () => apiQueries.healthCheck(),
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
  });

  return (
    <div className="container mx-auto py-8">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Filter className="h-8 w-8 text-primary" />
          <h1 className="page-title">Sistema para Saneamento de Materiais</h1>
        </div>
        <p className="page-description">
          Configure os filtros abaixo para consultar os saldos comparativos
          entre os sistemas SIAGRI e CIGAM e sanear o que for necessário para o SAP
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card de informações sobre empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : error ? (
                '---'
              ) : (
                stats?.empresas?.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Empresas disponíveis no sistema
            </p>
          </CardContent>
        </Card>

        {/* Card de informações sobre materiais */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : error ? (
                '---'
              ) : (
                stats?.materiais?.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de materiais cadastrados
            </p>
          </CardContent>
        </Card>

        {/* Card de informações sobre diferenças */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diferenças</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : error ? (
                '---'
              ) : (
                stats?.diferencas?.toLocaleString() || '0'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Materiais com diferenças de saldo
            </p>
          </CardContent>
        </Card>

        {/* Card de status da conexão com banco de dados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do Sistema
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : healthError ? (
                <span className="text-red-500">Offline</span>
              ) : healthStatus?.database === 'connected' ? (
                <span className="text-green-500">Online</span>
              ) : (
                <span className="text-red-500">Offline</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Conexão com banco de dados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Consulta</CardTitle>
          <CardDescription>
            Selecione os filtros desejados para consultar os saldos dos materiais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FiltersForm />
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Como usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. Selecione a empresa desejada
            </p>
            <p className="text-sm text-muted-foreground">
              2. Escolha o grupo de materiais (opcional)
            </p>
            <p className="text-sm text-muted-foreground">
              3. Refine por subgrupo se necessário
            </p>
            <p className="text-sm text-muted-foreground">
              4. Busque por material específico ou consulte todos
            </p>
            <p className="text-sm text-muted-foreground">
              5. Clique em "Consultar Saldos" para ver os resultados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Este sistema permite comparar os saldos de materiais entre os
              sistemas SIAGRI e CIGAM, identificando diferenças que precisam
              ser saneadas antes da migração para o SAP.
            </p>
            <p className="text-sm text-muted-foreground">
              As diferenças encontradas podem ser corrigidas diretamente
              através da interface, com registro de observações para
              auditoria.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}