# DOCUMENTAÇÃO DE ESTRUTURA DE CAMPOS - APP SANEAMENTO

## 1. BACKEND - SCHEMAS (Pydantic)

### EmpresaSchema
- codigo: int - Código da empresa (codi_emp)
- nome: str - Nome da empresa
- id: str - ID da empresa (código como string)

### GrupoSchema  
- codigo: int - Código do grupo (codi_gpr)
- descricao: str - Descrição do grupo
- id: str - ID do grupo (código como string)
- nome: str - Nome do grupo (descrição)

### SubgrupoSchema
- codigo: int - Código do subgrupo (codi_sbg)
- descricao: str - Descrição do subgrupo
- id: str - ID do subgrupo (código como string)
- nome: str - Nome do subgrupo (descrição)

### MaterialSchema
- codigo: str - Código do material (codi_psv)
- descricao: str - Descrição do material
- id: str - ID do material (código como string)
- nome: str - Nome do material (descrição)

### SaldoItemSchema
- empresa: int - Código da empresa
- grupo: int - Código do grupo
- material: str - Código do material
- descricao: str - Descrição do material
- status: StatusMaterial - Status do material (A/I)
- saldo_siagri: Decimal - Saldo no sistema SIAGRI
- saldo_cigam: Decimal - Saldo no sistema CIGAM
- diferenca_saldo: Decimal - Diferença entre saldos
- tipo_item: Optional[int] - Tipo do item (CODI_TIP)
- tipo_material: Optional[str] - Tipo do material (PRSE_PSV)
- codigo_grupo: Optional[int] - Código do grupo
- codigo_subgrupo: Optional[int] - Código do subgrupo
- unidade: Optional[str] - Unidade de medida
- ncm: Optional[str] - Classificação fiscal NCM

### MaterialUpdateSchema
- desc_psv: str - Descrição do material (max 120 chars)
- situ_psv: StatusMaterial - Status do material (A/I)
- unid_psv: str - Unidade do material (max 10 chars)
- clas_psv: Optional[str] - Classificação do tipo de produto (max 1 char)
- codi_cfp: Optional[str] - NCM - Classificação Fiscal (max 8 chars)
- codi_gpr: Optional[int] - Código do grupo
- codi_sbg: Optional[int] - Código do subgrupo
- codi_tip: Optional[int] - Código do tipo
- prse_psv: Optional[str] - Produto/Serviço (max 1 char)

### SaldosFilters
- empresa: Optional[int] - Código da empresa para filtro
- grupo: Optional[int] - Código do grupo para filtro
- subgrupo: Optional[int] - Código do subgrupo para filtro
- material: Optional[str] - Código/descrição do material para filtro

### PaginationParams
- page: int - Número da página (default: 1)
- size: int - Tamanho da página (default: 50, max: 1000)
- offset: int - Offset calculado para paginação

### HealthCheckResponse
- status: str - Status do sistema ('ok' | 'error')
- timestamp: str - Timestamp da verificação
- services: dict - Status dos serviços (database, redis, siagri, cigam)
- version: str - Versão da aplicação

## 2. BACKEND - MODELS (SQLAlchemy)

### Empresa
- id: Integer - Chave primária
- codi_emp: Integer - Código da empresa (único)
- iden_emp: String(120) - Nome da empresa
- situ_emp: String(1) - Situação da empresa (A/I)
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### Grupo
- id: Integer - Chave primária
- empresa_id: Integer - FK para empresas
- codi_gpr: Integer - Código do grupo
- desc_gpr: String(120) - Descrição do grupo
- situ_gpr: String(1) - Situação do grupo (A/I)
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### Subgrupo
- id: Integer - Chave primária
- grupo_id: Integer - FK para grupos
- codi_sbg: Integer - Código do subgrupo
- desc_sbg: String(120) - Descrição do subgrupo
- situ_sbg: String(1) - Situação do subgrupo (A/I)
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### Produto
- id: Integer - Chave primária
- empresa_id: Integer - FK para empresas
- grupo_id: Integer - FK para grupos (nullable)
- subgrupo_id: Integer - FK para subgrupos (nullable)
- codi_psv: String(15) - Código do produto
- desc_psv: String(120) - Descrição do produto
- situ_psv: String(1) - Situação do produto (A/I)
- unid_psv: String(3) - Unidade de medida
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### SaldoSiagri
- id: Integer - Chave primária
- empresa_id: Integer - FK para empresas
- produto_id: Integer - FK para produtos
- saldo: Numeric(15,3) - Saldo atual no SIAGRI
- data_atualizacao: DateTime - Data da última atualização
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### SaldoCigam
- id: Integer - Chave primária
- produto_id: Integer - FK para produtos
- cd_material: String(15) - Código do material no CIGAM
- cd_unidade_de_n: String(3) - Código da unidade de negócio
- quantidade: Numeric(15,3) - Quantidade em estoque
- data_atualizacao: DateTime - Data da última atualização
- created_at: DateTime - Data de criação
- updated_at: DateTime - Data de atualização

### HistoricoMovimentacao
- id: Integer - Chave primária
- produto_id: Integer - FK para produtos
- tipo_movimentacao: String(1) - Tipo de movimentação (E/S)
- quantidade: Numeric(15,3) - Quantidade movimentada
- saldo_anterior: Numeric(15,3) - Saldo antes da movimentação
- saldo_atual: Numeric(15,3) - Saldo após a movimentação
- sistema_origem: String(10) - Sistema de origem (SIAGRI/CIGAM)
- observacoes: Text - Observações da movimentação
- data_movimentacao: DateTime - Data da movimentação
- created_at: DateTime - Data de criação

## 3. TABELAS ORACLE

### JUPARANA.CADEMP (Empresas)
- CODI_EMP: NUMBER - Código da empresa
- IDEN_EMP: VARCHAR2(120) - Nome da empresa
- SITU_EMP: CHAR(1) - Situação da empresa (A/I)

### JUPARANA.GRUPO (Grupos)
- CODI_GPR: NUMBER - Código do grupo
- DESC_GPR: VARCHAR2(120) - Descrição do grupo
- SITU_GPR: CHAR(1) - Situação do grupo (A/I)

### JUPARANA.PRODSERV (Produtos/Serviços)
- CODI_PSV: VARCHAR2(15) - Código do produto
- DESC_PSV: VARCHAR2(120) - Descrição do produto
- SITU_PSV: CHAR(1) - Situação do produto (A/I)
- PRSE_PSV: CHAR(1) - Produto/Serviço (P/S/U)
- UNID_PSV: VARCHAR2(3) - Unidade de medida
- CODI_GPR: NUMBER - Código do grupo
- CODI_SBG: NUMBER - Código do subgrupo
- CODI_TIP: NUMBER - Código do tipo
- CLAS_PSV: CHAR(1) - Classificação do produto (P/F/M/E)

### JUPARANA.PRODUTO (Detalhes do Produto)
- CODI_PSV: VARCHAR2(15) - Código do produto
- CFIS_PRO: VARCHAR2(8) - Classificação fiscal (NCM)

### CIGAM11.ESESTOQU (Estoque CIGAM)
- CD_MATERIAL: VARCHAR2(15) - Código do material
- CD_UNIDADE_DE_N: VARCHAR2(3) - Código da unidade de negócio
- QUANTIDADE: NUMBER - Quantidade em estoque

### CIGAM11.ESMATERI (Materiais CIGAM)
- CD_MATERIAL: VARCHAR2(15) - Código do material
- DESCRICAO: VARCHAR2(120) - Descrição do material
- CLASSIFICACAO_F: VARCHAR2(8) - Classificação fiscal (NCM)

## 4. FRONTEND - TYPES (TypeScript)

### Empresa
- id: string - ID da empresa
- codigo: number - Código da empresa
- nome: string - Nome da empresa

### Grupo
- id: string - ID do grupo
- codigo: number - Código do grupo
- nome: string - Nome do grupo
- descricao: string - Descrição do grupo

### Subgrupo
- id: string - ID do subgrupo
- codigo: number - Código do subgrupo
- nome: string - Nome do subgrupo
- descricao: string - Descrição do subgrupo

### Material
- id: string - ID do material
- codigo: string - Código do material
- nome: string - Nome do material
- descricao: string - Descrição do material
- unidade?: string - Unidade de medida
- grupo_id?: string - ID do grupo
- subgrupo_id?: string - ID do subgrupo

### SaldoItem
- empresa: number - Código da empresa
- grupo: number - Código do grupo
- material: string - Código do material
- descricao: string - Descrição do material
- status: StatusComparacao - Status da comparação
- saldo_siagri: number - Saldo no SIAGRI
- saldo_cigam: number - Saldo no CIGAM
- diferenca: number - Diferença entre saldos
- diferenca_percentual: number - Diferença percentual
- historico: HistoricoSaldo[] - Histórico de saldos
- ultima_atualizacao: string - Data da última atualização

### DetalheMaterial
- codigo: string - Código do material
- descricao: string - Descrição do material
- empresa: Empresa - Dados da empresa
- grupo?: Grupo - Dados do grupo
- subgrupo?: Subgrupo - Dados do subgrupo
- unidade?: string - Unidade de medida
- status: StatusComparacao - Status do material
- saldo_siagri: number - Saldo no SIAGRI
- saldo_cigam: number - Saldo no CIGAM
- diferenca: number - Diferença entre saldos
- diferenca_percentual: number - Diferença percentual
- historico: HistoricoSaldo[] - Histórico de movimentações
- ultima_atualizacao: string - Data da última atualização

### HistoricoSaldo
- id: string - ID do histórico
- data: string - Data da movimentação
- usuario?: string - Usuário responsável
- saldo_siagri_anterior: number - Saldo SIAGRI anterior
- saldo_siagri_novo: number - Novo saldo SIAGRI
- saldo_cigam_anterior: number - Saldo CIGAM anterior
- saldo_cigam_novo: number - Novo saldo CIGAM
- observacoes?: string - Observações

### HealthCheck
- status: 'ok' | 'error' - Status do sistema
- timestamp: string - Timestamp da verificação
- services: object - Status dos serviços
  - database: 'ok' | 'error' - Status do banco
  - redis: 'ok' | 'error' - Status do Redis
  - siagri: 'ok' | 'error' - Status do SIAGRI
  - cigam: 'ok' | 'error' - Status do CIGAM
- version: string - Versão da aplicação

### Statistics
- empresas: number - Quantidade de empresas
- materiais: number - Quantidade de materiais
- diferencas: number - Quantidade de diferenças

### FormFilters
- empresa_id: string - ID da empresa selecionada
- grupo_id?: string - ID do grupo selecionado
- subgrupo_id?: string - ID do subgrupo selecionado
- material_id?: string - ID do material selecionado
- apenas_divergentes: boolean - Filtrar apenas divergentes
- saldos_positivos_siagri: boolean - Filtrar saldos positivos SIAGRI
- saldos_positivos_cigam: boolean - Filtrar saldos positivos CIGAM

### ApiResponse<T>
- data: T - Dados da resposta
- message?: string - Mensagem da resposta
- success: boolean - Indicador de sucesso

### ApiError
- message: string - Mensagem de erro
- code?: string - Código do erro
- details?: any - Detalhes adicionais do erro

### SelectOption
- value: string - Valor da opção
- label: string - Label da opção
- disabled?: boolean - Se a opção está desabilitada

### TableColumn<T>
- key: keyof T - Chave da coluna
- label: string - Label da coluna
- sortable?: boolean - Se a coluna é ordenável
- width?: string - Largura da coluna
- align?: 'left' | 'center' | 'right' - Alinhamento
- render?: function - Função de renderização customizada

### TableProps<T>
- data: T[] - Dados da tabela
- columns: TableColumn<T>[] - Colunas da tabela
- loading?: boolean - Estado de carregamento
- pagination?: object - Configurações de paginação
- onRowClick?: function - Callback de clique na linha

## 5. ENUMS E CONSTANTES

### StatusMaterial (Backend)
- ATIVO: "A" - Material ativo
- INATIVO: "I" - Material inativo

### StatusComparacao (Frontend)
- 'divergente' - Saldos diferentes
- 'ok' - Saldos iguais
- 'erro' - Erro na comparação

### TipoFiltro (Frontend)
- 'empresa' - Filtro por empresa
- 'grupo' - Filtro por grupo
- 'subgrupo' - Filtro por subgrupo
- 'material' - Filtro por material

### Theme (Frontend)
- 'light' - Tema claro
- 'dark' - Tema escuro
- 'system' - Tema do sistema

## 6. CONFIGURAÇÕES E CONTEXTOS

### AppConfig
- apiUrl: string - URL da API
- pageSize: number - Tamanho padrão da página
- cacheTimeout: number - Timeout do cache
- enableDevtools: boolean - Habilitar ferramentas de desenvolvimento

### AppContextType
- filters: FiltrosEstoque - Filtros ativos
- setFilters: function - Função para definir filtros
- clearFilters: function - Função para limpar filtros

### ThemeContextType
- theme: Theme - Tema atual
- setTheme: function - Função para definir tema

## 7. HOOKS E UTILITÁRIOS

### UseFiltersReturn
- empresas: Empresa[] - Lista de empresas
- grupos: Grupo[] - Lista de grupos
- subgrupos: Subgrupo[] - Lista de subgrupos
- materiais: Material[] - Lista de materiais
- isLoading: boolean - Estado de carregamento
- error: string | null - Erro se houver
- refetch: function - Função para recarregar dados

### UseSaldosReturn
- saldos: SaldoResponse | null - Dados dos saldos
- isLoading: boolean - Estado de carregamento
- error: string | null - Erro se houver
- refetch: function - Função para recarregar dados

## 8. QUERIES SQL PRINCIPAIS

### Query de Saldos SIAGRI
```sql
SELECT
    EMPRESA.CODI_EMP,
    P.CODI_GPR,
    P.CODI_PSV,
    P.DESC_PSV,
    P.SITU_PSV,
    COALESCE(SUM(SALD_CTR), 0) AS SALDO
FROM JUPARANA.PRODSERV P
JOIN EMPRESA ON 1 = 1
WHERE P.PRSE_PSV = 'U'
AND P.CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
```

### Query de Saldos CIGAM
```sql
SELECT
    CAST(E.CD_UNIDADE_DE_N AS NUMBER) AS EMPRESA,
    CAST(E.CD_MATERIAL AS VARCHAR2(15)) AS MATERIAL,
    CAST(M.DESCRICAO AS VARCHAR2(120)) AS DESCRICAO,
    CAST(E.QUANTIDADE AS NUMBER) AS SALDO
FROM CIGAM11.ESESTOQU E
JOIN CIGAM11.ESMATERI M ON E.CD_MATERIAL = M.CD_MATERIAL
```

### Query de Comparação de Saldos
```sql
SELECT 
    S1.EMPRESA,
    S1.GRUPO,
    S1.MATERIAL,
    S1.DESCRICAO,
    S1.STATUS,
    S1.SALDO AS SALDO_SIAGRI,
    COALESCE(S2.SALDO, 0) AS SALDO_CIGAM,
    (S1.SALDO - COALESCE(S2.SALDO, 0)) AS DIFERENCA_SALDO
FROM SALDO_SIAGRI S1
LEFT JOIN SALDO_CIGAM S2 ON S1.MATERIAL = S2.MATERIAL
WHERE S1.SALDO <> COALESCE(S2.SALDO, 0)
```

---

**Observações Importantes:**
1. Todos os campos de texto têm limitações de tamanho conforme definido no banco Oracle
2. O campo CLAS_PSV aceita apenas 1 caractere (P/F/M/E)
3. NCM/Classificação Fiscal pode ter até 8 caracteres
4. Saldos são armazenados com precisão de 3 casas decimais
5. Datas seguem o padrão ISO 8601 no frontend
6. IDs são sempre strings no frontend para compatibilidade
7. Códigos numéricos são convertidos para string quando necessário