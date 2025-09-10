import { Metadata } from 'next';
import { FiltersForm } from '@/components/filters/filters-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Package, Filter } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Filtros de Estoque',
  description: 'Configure os filtros para consultar o estoque de materiais',
};

/**
 * Página inicial da aplicação com formulário de filtros
 * Permite ao usuário selecionar empresa, grupo, subgrupo e produto
 * para consultar os saldos comparativos entre SIAGRI e CIGAM
 */
export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Filter className="h-8 w-8 text-primary" />
          <h1 className="page-title">Sistema de Controle de Estoque</h1>
        </div>
        <p className="page-description">
          Configure os filtros abaixo para consultar os saldos comparativos
          entre os sistemas SIAGRI e CIGAM
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {/* Card de informações sobre empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Empresas disponíveis no sistema
            </p>
          </CardContent>
        </Card>

        {/* Card de informações sobre produtos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.847</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>

        {/* Card de status do sistema */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              Sistemas SIAGRI e CIGAM conectados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Consulta</CardTitle>
          <CardDescription>
            Selecione os filtros desejados para consultar os saldos de estoque.
            Todos os campos são opcionais, mas pelo menos um deve ser preenchido.
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
              1. Selecione a empresa desejada (obrigatório)
            </p>
            <p className="text-sm text-muted-foreground">
              2. Escolha o grupo de produtos (opcional)
            </p>
            <p className="text-sm text-muted-foreground">
              3. Refine com subgrupo e produto específico
            </p>
            <p className="text-sm text-muted-foreground">
              4. Clique em "Consultar Saldos" para ver os resultados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Este sistema permite comparar os saldos de estoque entre os
              sistemas SIAGRI e CIGAM em tempo real.
            </p>
            <p className="text-sm text-muted-foreground">
              Os dados são atualizados automaticamente e incluem informações
              detalhadas sobre divergências entre os sistemas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}