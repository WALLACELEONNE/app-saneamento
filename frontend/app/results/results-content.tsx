'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Download,
  Filter,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import { apiQueries } from '@/lib/api';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import type { SaldoItem, StatusComparacao } from '@/types';
import { EditProductModal } from '@/components/edit-product-modal';
import { useApiQuery } from '@/hooks/use-api-query';

export function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  
  // Estados para o modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SaldoItem | null>(null);

  /**
   * Definição das colunas da tabela
   */
  const columns: ColumnDef<SaldoItem>[] = [
  {
    accessorKey: 'material',
    header: 'Código',
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.original.material || 'N/A'}
      </div>
    ),
  },
  {
    accessorKey: 'descricao',
    header: 'Produto',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <div className="font-medium truncate">
          {row.original.descricao}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'subgrupo',
    header: 'Subgrupo',
    cell: ({ row }) => (
      <div className="text-center font-mono text-sm">
        {row.original.subgrupo || 'N/A'}
      </div>
    ),
  },
  {
    accessorKey: 'saldo_siagri',
    header: 'SIAGRI',
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatNumber(row.getValue('saldo_siagri'))}
      </div>
    ),
  },
  {
    accessorKey: 'saldo_cigam',
    header: 'CIGAM',
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatNumber(row.getValue('saldo_cigam'))}
      </div>
    ),
  },
  {
    accessorKey: 'diferenca_saldo',
    header: 'Diferença',
    cell: ({ row }) => {
      const diferenca = row.getValue('diferenca_saldo') as number;
      const isPositive = diferenca > 0;
      const isZero = diferenca === 0;
      
      return (
        <div className={cn(
          'text-right font-mono flex items-center justify-end gap-1',
          isZero ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {!isZero && (
            isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )
          )}
          {formatNumber(diferenca)}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      
      // Se o status for 'A' ou 'I', mostrar Ativo/Inativo
      if (status === 'A' || status === 'I') {
        return (
          <div className="text-center">
            <Badge variant={status === 'A' ? 'default' : 'secondary'}>
              {status === 'A' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        );
      }
      
      // Caso contrário, mostrar status de comparação
      const statusSaldo = status as StatusComparacao;
      
      const statusConfig = {
        'igual': { label: 'OK', variant: 'default' as const, icon: CheckCircle },
        'divergente': { label: 'Divergente', variant: 'destructive' as const, icon: AlertTriangle },
        'apenas_siagri': { label: 'Apenas SIAGRI', variant: 'secondary' as const, icon: TrendingUp },
        'apenas_cigam': { label: 'Apenas CIGAM', variant: 'secondary' as const, icon: TrendingDown },
      };
      
      const config = statusConfig[statusSaldo] || statusConfig['igual'];
      const Icon = config.icon;
      
      return (
        <Badge variant={config.variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    header: 'Ações',
    cell: ({ row }) => {
      const saldo = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                router.push(`/material/${saldo.material}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedProduct(saldo);
                setEditModalOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar produto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(saldo.material || saldo.descricao);
                toast.success('Código copiado para a área de transferência');
              }}
            >
              Copiar código
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

  // Converte os parâmetros de busca em filtros
  const filters = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (value) {
        // Mantém os nomes originais dos parâmetros da URL
        // O mapeamento será feito na camada da API
        params[key] = value;
      }
    });
    return params;
  }, [searchParams]);

  // Query para buscar os saldos
  const {
    data: saldosData,
    isLoading,
    error,
  } = useApiQuery({
    queryKey: apiQueries.keys.saldos(filters, {}),
    queryFn: () => apiQueries.saldos(filters, {}),
  });

  // Configuração da tabela
  const table = useReactTable({
    data: saldosData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: saldosData ? Math.ceil(saldosData.total / pagination.pageSize) : 0,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  // Estatísticas dos dados
  const stats = useMemo(() => {
    if (!saldosData?.items) return null;
    
    const items = saldosData.items;
    const total = items.length;
    const divergentes = items.filter(item => item.status === 'I').length;
    const ok = items.filter(item => item.status === 'A').length;
    // Calcular divergências baseadas nos saldos
    const apenas_siagri = items.filter(item => item.saldo_siagri > 0 && item.saldo_cigam === 0).length;
    const apenas_cigam = items.filter(item => item.saldo_cigam > 0 && item.saldo_siagri === 0).length;
    
    return { total, divergentes, apenas_siagri, apenas_cigam, ok };
  }, [saldosData]);

  /**
   * Exporta os dados para CSV
   */
  const exportToCsv = () => {
    if (!saldosData?.items) return;
    
    const headers = ['Código', 'Produto', 'SIAGRI', 'CIGAM', 'Diferença', 'Status'];
    const rows = saldosData.items.map(item => [
      item.material || '',
      item.descricao || '',
      item.saldo_siagri.toString(),
      item.saldo_cigam.toString(),
      item.diferenca_saldo.toString(),
      item.status,
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `saldos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Dados exportados com sucesso!');
  };

  if (Object.keys(filters).length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Nenhum filtro aplicado</CardTitle>
            <CardDescription>
              Volte à página inicial e selecione os filtros para consultar os saldos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar dados</CardTitle>
            <CardDescription>
              Ocorreu um erro ao consultar os saldos. Tente novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resultados da Consulta</h1>
          <p className="text-muted-foreground">
            Saldos de estoque comparados entre SIAGRI e CIGAM
          </p>
        </div>
        <Button onClick={() => router.push('/')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nova Consulta
        </Button>
      </div>

      {/* Filtros aplicados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros Aplicados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => (
              <Badge key={key} variant="secondary">
                {key}: {value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(saldosData?.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total} itens nesta página
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Divergentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.divergentes}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.divergentes / stats.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Apenas SIAGRI</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.apenas_siagri}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.apenas_siagri / stats.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Apenas CIGAM</CardTitle>
              <AlertTriangle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.apenas_cigam}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.apenas_cigam / stats.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OK</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.ok / stats.total) * 100).toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saldos de Estoque</CardTitle>
              <CardDescription>
                Comparação detalhada entre os sistemas SIAGRI e CIGAM
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCsv}
                disabled={!saldosData?.items?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginação */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    saldosData?.total || 0
                  )}{' '}
                  de {saldosData?.total || 0} resultados
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de edição */}
      <EditProductModal
        product={selectedProduct}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}