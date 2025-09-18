/**
 * Tipos e interfaces para o sistema de controle de estoque
 */

// Enums
export enum TipoFiltro {
  EMPRESA = 'empresa',
  GRUPO = 'grupo',
  SUBGRUPO = 'subgrupo',
  MATERIAL = 'material',
}

export enum StatusSaldo {
  ATIVO = 'A',
  INATIVO = 'I',
}

// Tipo para status de comparação de saldos
export type StatusComparacao = 'igual' | 'divergente' | 'apenas_siagri' | 'apenas_cigam';

// Interfaces base
export interface BaseEntity {
  id: string;
  nome: string;
}

export interface Empresa extends BaseEntity {
  codigo: number; // codi_emp
  cnpj?: string;
  ativa: boolean;
}

export interface Grupo extends BaseEntity {
  codigo: number; // codi_gpr
  descricao: string;
}

export interface Subgrupo extends BaseEntity {
  codigo: number; // codi_sbg
  descricao: string;
  grupo_id: string;
  grupo_nome?: string;
}

export interface Material extends BaseEntity {
  codigo: string; // codi_psv
  descricao: string;
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
  material_id?: string;
  status?: StatusSaldo;
  apenas_divergentes?: boolean;
  saldos_positivos_siagri?: boolean;
  saldos_positivos_cigam?: boolean;
}

// Interfaces para saldos
export interface SaldoItem {
  empresa: number;
  grupo?: number;
  subgrupo?: number;
  material: string;
  descricao: string;
  status: 'A' | 'I';
  saldo_siagri: number;
  saldo_cigam: number;
  diferenca_saldo: number;
  // Novos campos para edição
  tipo_item?: string;
  tipo_material?: string;
  codigo_grupo?: number;
  codigo_subgrupo?: number;
  unidade?: string;
  ncm_cla_fiscal?: string;
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
  material_id: string; // P.CODI_PSV -- STRING
  empresa_id: string; // Convertido para string para consistência
  novo_saldo_siagri: number;
  novo_saldo_cigam: number;
  observacoes?: string;
  // Campos editáveis - tipos validados conforme banco de dados
  desc_psv: string; // P.DESC_PSV -- STRING
  unid_psv: string; // P.UNID_PSV -- STRING (obrigatório)
  situ_psv: 'A' | 'I'; // P.SITU_PSV -- STRING
  codi_cfp?: string; // P.CODI_CFP -- STRING (opcional)
  codi_gpr?: number; // P.CODI_GPR -- NUMBER
  codi_sbg?: number; // P.CODI_SBG -- NUMBER
  codi_tip?: number; // P.CODI_TIP -- NUMBER
  prse_psv?: string; // P.PRSE_PSV -- STRING
}

// Interface para detalhes do material
export interface DetalheMaterial {
  material: Material;
  empresa: Empresa;
  saldo_siagri: number;
  saldo_cigam: number;
  diferenca: number;
  diferenca_percentual: number;
  status: StatusComparacao;
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

// Interface para estatísticas do sistema
export interface Statistics {
  empresas: number;
  materiais: number;
  diferencas: number;
}

// Tipos para formulários
export interface FormFilters {
  empresa_id: string;
  grupo_id?: string;
  subgrupo_id?: string;
  material_id?: string;
  apenas_divergentes: boolean;
  saldos_positivos_siagri: boolean;
  saldos_positivos_cigam: boolean;
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
  materiais: Material[];
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