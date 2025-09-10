import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Building2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';
import type { DetalheMaterial, StatusSaldo } from '@/types';

interface MaterialPageProps {
  params: {
    id: string;
  };
}

/**
 * Gera metadados dinâmicos para a página do material
 */
export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  try {
    // We need to pass empresa_id, but we don't have it here
    // For now, we'll use a placeholder
    const material = await api.getDetalheMaterial(params.id, '1');
    
    return {
      title: `${material.produto.codigo ? `${material.produto.codigo} - ` : ''}${material.produto.nome} | Sistema de Saneamento`,
      description: `Detalhes do material ${material.produto.nome}. Status: ${material.status}. Diferença entre sistemas: ${formatNumber(material.diferenca)}.`,
    };
  } catch {
    return {
      title: 'Material não encontrado | Sistema de Saneamento',
      description: 'O material solicitado não foi encontrado no sistema.',
    };
  }
}

/**
 * Página de detalhes do material (acesso direto)
 * Exibe informações completas sobre o produto e suas divergências
 */
export default async function MaterialPage({ params }: MaterialPageProps) {
  let material: DetalheMaterial;
  
  try {
    // We need to pass empresa_id, but we don't have it here
    // For now, we'll use a placeholder
    material = await api.getDetalheMaterial(params.id, '1');
  } catch {
    notFound();
  }

  /**
   * Renderiza o badge de status
   */
  const renderStatusBadge = (status: StatusSaldo) => {
    const statusConfig = {
      igual: { label: 'OK', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      divergente: { label: 'Divergente', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      apenas_siagri: { label: 'Apenas SIAGRI', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      apenas_cigam: { label: 'Apenas CIGAM', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
    };
    
    const config = statusConfig[status] || statusConfig.igual;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header com navegação */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/results" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos resultados
            </Link>
          </Button>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {material.produto.codigo ? `${material.produto.codigo} - ` : ''}{material.produto.nome}
          </h1>
          <p className="text-muted-foreground">
            Detalhes completos do produto e comparação entre sistemas
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Status e informações básicas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {renderStatusBadge(material.status)}
            <div className="text-sm text-muted-foreground">
              Última atualização: {formatDate(material.ultima_atualizacao)}
            </div>
          </div>
        </div>

        {/* Cards de saldos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SIAGRI</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatNumber(material.saldo_siagri)}
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo no sistema SIAGRI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CIGAM</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatNumber(material.saldo_cigam)}
              </div>
              <p className="text-xs text-muted-foreground">
                Saldo no sistema CIGAM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Diferença</CardTitle>
              {material.diferenca > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : material.diferenca < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold font-mono',
                material.diferenca > 0 ? 'text-green-600' : material.diferenca < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {material.diferenca > 0 ? '+' : ''}{formatNumber(material.diferenca)}
              </div>
              <p className="text-xs text-muted-foreground">
                Diferença entre sistemas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% Diferença</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold font-mono',
                Math.abs(material.diferenca_percentual) > 10 ? 'text-red-600' : Math.abs(material.diferenca_percentual) > 5 ? 'text-yellow-600' : 'text-muted-foreground'
              )}>
                {material.diferenca_percentual.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Percentual de diferença
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações do produto */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Código:</span>
                  <span className="text-sm font-mono">{material.produto.codigo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Nome:</span>
                  <span className="text-sm">{material.produto.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Grupo:</span>
                  <span className="text-sm">{material.grupo_nome || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Subgrupo:</span>
                  <span className="text-sm">{material.subgrupo_nome || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Unidade:</span>
                  <span className="text-sm">{material.unidade || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Empresa:</span>
                  <span className="text-sm">{material.empresa_nome || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {renderStatusBadge(material.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Última Atualização:</span>
                  <span className="text-sm">{formatDate(material.ultima_atualizacao)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de movimentações (se disponível) */}
        {material.historico && material.historico.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
              <CardDescription>
                Últimas movimentações registradas nos sistemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {material.historico.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Movimentação</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.data)}
                      </div>
                      {item.observacoes && (
                        <div className="text-xs text-muted-foreground italic">
                          {item.observacoes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        {formatNumber(item.saldo_siagri_novo)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        SIAGRI
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        {formatNumber(item.saldo_cigam_novo)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        CIGAM
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/results">
              Voltar aos Resultados
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}