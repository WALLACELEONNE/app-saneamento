/**
 * Tipos e interfaces para o sistema de controle de estoque
 */

// Enums
export enum TipoFiltro {
  EMPRESA = 'empresa',
  GRUPO = 'grupo',
  SUBGRUPO = 'subgrupo',
  PRODUTO = 'produto',
}

export enum StatusSaldo {
  ATIVO = 'A',
  INATIVO = 'I',
}

// Interfaces base
export interface BaseEntity {
  id: string;
  nome: string;
  codigo?: string;
}

export interface Empresa extends BaseEntity {
  cnpj?: string;
  ativa: boolean;
}

export interface Grupo extends BaseEntity {
  descricao?: string;
}

export interface Subgrupo extends BaseEntity {
  grupo_id: string;
  grupo_nome?: string;
}

export interface Produto extends BaseEntity {
  grupo_id?: string;
  subgrupo_id?: string;
  unidade?: string;
  ativo: boolean;
}

// Interfaces para filtros
export interface FiltrosEstoque {
  empresa_id?: string;
  grupo_id?: string;
  subgrupo_id?: string;
  produto_id?: string;
  status?: StatusSaldo;
  apenas_divergentes?: boolean;
}

// Interfaces para saldos
export interface SaldoItem {
  empresa: number;
  grupo?: number;
  material: string;
  descricao: string;
  status: 'A' | 'I';
  saldo_siagri: number;
  saldo_cigam: number;
  diferenca_saldo: number;
}

export interface SaldoResponse {
  items: SaldoItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Interface para paginação
export interface PaginationParams {
  page?: number;
  size?: number;
}

// Interface para atualização de material
export interface AtualizarMaterial {
  produto_id: string;
  empresa_id: string;
  novo_saldo_siagri?: number;
  novo_saldo_cigam?: number;
  observacoes?: string;
}

// Interface para detalhes do material
export interface DetalheMaterial {
  produto: Produto;
  empresa: Empresa;
  saldo_siagri: number;
  saldo_cigam: number;
  diferenca: number;
  diferenca_percentual: number;
  status: StatusSaldo;
  historico: HistoricoSaldo[];
  ultima_atualizacao: string;
}

// Interface para histórico de saldos
export interface HistoricoSaldo {
  id: string;
  data: string;
  usuario?: string;
  saldo_siagri_anterior: number;
  saldo_siagri_novo: number;
  saldo_cigam_anterior: number;
  saldo_cigam_novo: number;
  observacoes?: string;
}

// Interface para health check
export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    siagri: 'ok' | 'error';
    cigam: 'ok' | 'error';
  };
  version: string;
}

// Tipos para formulários
export interface FormFilters {
  empresa_id: string;
  grupo_id?: string;
  subgrupo_id?: string;
  produto_id?: string;
  apenas_divergentes: boolean;
}

// Tipos para API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Tipos para componentes de UI
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    size: number;
    total: number;
    onPageChange: (page: number) => void;
    onSizeChange: (size: number) => void;
  };
  onRowClick?: (item: T) => void;
}

// Tipos para hooks
export interface UseFiltersReturn {
  empresas: Empresa[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
  produtos: Produto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseSaldosReturn {
  saldos: SaldoResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Tipos para contextos
export interface AppContextType {
  filters: FiltrosEstoque;
  setFilters: (filters: FiltrosEstoque) => void;
  clearFilters: () => void;
}

// Tipos utilitários
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Tipos para eventos
export interface FilterChangeEvent {
  type: TipoFiltro;
  value: string;
  clearDependent?: boolean;
}

// Tipos para configurações
export interface AppConfig {
  apiUrl: string;
  pageSize: number;
  cacheTimeout: number;
  enableDevtools: boolean;
}

// Tipos para tema
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}