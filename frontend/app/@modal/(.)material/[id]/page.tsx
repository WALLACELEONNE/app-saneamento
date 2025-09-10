'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { X, Package, Building2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { apiQueries } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';
import type { StatusSaldo } from '@/types';

interface MaterialModalProps {
  params: {
    id: string;
  };
}

/**
 * Modal intercepted route para exibir detalhes do material
 * Exibe informações completas sobre o produto e suas divergências
 */
export default function MaterialModal({ params }: MaterialModalProps) {
  const router = useRouter();
  const { id } = params;

  // Query para buscar detalhes do material
  const {
    data: material,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['material', id],
    queryFn: () => apiQueries.detalheMaterial(id, ''), // Passando empresa_id vazio por enquanto
    enabled: !!id,
  });

  /**
   * Fecha o modal e volta para a página anterior
   */
  const handleClose = () => {
    router.back();
  };

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

  /**
   * Renderiza o conteúdo de loading
   */
  const renderLoading = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-40 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * Renderiza o conteúdo de erro
   */
  const renderError = () => (
    <div className="text-center py-8">
      <div className="text-red-600 mb-4">
        <Package className="h-12 w-12 mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Erro ao carregar detalhes</h3>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os detalhes do material.
        </p>
      </div>
      <Button onClick={() => window.location.reload()} variant="outline">
        Tentar novamente
      </Button>
    </div>
  );

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">
                {isLoading ? (
                  <Skeleton className="h-6 w-48" />
                ) : material ? (
                  `${material.produto.codigo ? `${material.produto.codigo} - ` : ''}${material.produto.nome}`
                ) : (
                  'Material não encontrado'
                )}
              </DialogTitle>
              <DialogDescription>
                {isLoading ? (
                  <Skeleton className="h-4 w-64" />
                ) : material ? (
                  `Detalhes completos do produto e comparação entre sistemas`
                ) : (
                  'Não foi possível carregar os detalhes do material'
                )}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            renderLoading()
          ) : error ? (
            renderError()
          ) : material ? (
            <>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
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
                    <div className="space-y-3">
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
                    <CardTitle>Histórico Recente</CardTitle>
                    <CardDescription>
                      Últimas movimentações registradas nos sistemas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {material.historico.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Movimentação</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(item.data)}
                            </div>
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
            </>
          ) : (
            renderError()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}