from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from enum import Enum

class StatusMaterial(str, Enum):
    """
    Status do material no sistema
    Valores possíveis: A (Ativo), I (Inativo)
    """
    ATIVO = "A"
    INATIVO = "I"

class EmpresaSchema(BaseModel):
    """
    SELECT CODI_EMP as codigo, IDEN_EMP as nome 
    FROM juparana.CADEMP 
    WHERE SITU_EMP = 'A'
    ORDER BY IDEN_EMP
    """
    codigo: int = Field(..., description="Código da empresa (codi_emp)")
    nome: str = Field(..., description="Nome da empresa")
    # Campo id para compatibilidade com frontend (usa código como string)
    id: str = Field(..., description="ID da empresa (código como string)")
    
    def __init__(self, **data):
        if 'id' not in data and 'codigo' in data:
            data['id'] = str(data['codigo'])
        super().__init__(**data)

class GrupoSchema(BaseModel):
    """
    SELECT CODI_GPR as codigo, DESC_GPR as descricao
    FROM juparana.GRUPO
    WHERE CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
    AND SITU_GPR = 'A'
    ORDER BY CODI_GPR
    """
    codigo: int = Field(..., description="Código do grupo (codi_gpr)")
    descricao: str = Field(..., description="Descrição do grupo")
    # Campo id para compatibilidade com frontend (usa código como string)
    id: str = Field(..., description="ID do grupo (código como string)")
    # Campo nome para compatibilidade com frontend (usa descrição)
    nome: str = Field(..., description="Nome do grupo (descrição)")
    
    def __init__(self, **data):
        if 'id' not in data and 'codigo' in data:
            data['id'] = str(data['codigo'])
        if 'nome' not in data and 'descricao' in data:
            data['nome'] = data['descricao']
        super().__init__(**data)

class SubgrupoSchema(BaseModel):
    """
    SELECT DISTINCT 
        CODI_SBG as codigo,
        DESC_SBG as descricao
    FROM juparana.subgrupo
    WHERE CODI_GPR = :grupo
    AND SITU_SBG = 'A'
    ORDER BY DESC_SBG
    """
    codigo: int = Field(..., description="Código do subgrupo (codi_sbg)")
    descricao: str = Field(..., description="Descrição do subgrupo")
    # Campo id para compatibilidade com frontend (usa código como string)
    id: str = Field(..., description="ID do subgrupo (código como string)")
    # Campo nome para compatibilidade com frontend (usa descrição)
    nome: str = Field(..., description="Nome do subgrupo (descrição)")
    
    def __init__(self, **data):
        if 'id' not in data and 'codigo' in data:
            data['id'] = str(data['codigo'])
        if 'nome' not in data and 'descricao' in data:
            data['nome'] = data['descricao']
        super().__init__(**data)

class MaterialSchema(BaseModel):
    """
    SELECT DISTINCT 
        p.codi_psv as codigo, 
        p.DESC_PSV as descricao
    FROM JUPARANA.prodserv p
    WHERE UPPER(p.DESC_PSV) LIKE UPPER(:search)
    AND p.prse_psv = 'U'
    AND p.SITU_PSV = 'A'
    AND (:grupo IS NULL OR p.CODI_GPR = :grupo)
    AND (:subgrupo IS NULL OR p.CODI_SBG = :subgrupo)
    ORDER BY p.DESC_PSV FETCH FIRST :limit ROWS ONLY
    """
    codigo: str = Field(..., description="Código do material (codi_psv)")
    descricao: str = Field(..., description="Descrição do material")
    # Campo id para compatibilidade com frontend (usa código como string)
    id: str = Field(..., description="ID do material (código como string)")
    # Campo nome para compatibilidade com frontend (usa descrição)
    nome: str = Field(..., description="Nome do material (descrição)")
    
    def __init__(self, **data):
        if 'id' not in data and 'codigo' in data:
            data['id'] = str(data['codigo'])
        if 'nome' not in data and 'descricao' in data:
            data['nome'] = data['descricao']
        super().__init__(**data)

class SaldosFilters(BaseModel):
    """
    WITH EMPRESA (CODI_EMP) AS (
        SELECT DISTINCT CODI_EMP FROM juparana.CADEMP
    ),
    SALDO_CALCULADO AS (
        SELECT
            EMPRESA.CODI_EMP,
            P.CODI_GPR,
            p.codi_psv,
            p.DESC_PSV,
            p.SITU_PSV,
            e.tipo_est,
            COALESCE((
                SELECT SUM(sald_ctr) 
                FROM TABLE(JUPARANA.saldo_inicial_tipoest(
                    EMPRESA.CODI_EMP, e.tipo_est, p.codi_psv, SYSDATE, 'S', NULL, NULL
                ))
            ), 0) AS SALDO
        FROM JUPARANA.prodserv p
        JOIN JUPARANA.estoque e ON e.TIPO_EST = 2
        JOIN EMPRESA ON 1 = 1
        WHERE p.prse_psv = 'U'
        AND p.CODI_GPR IN (80, 81, 83, 84)
        AND (:empresa IS NULL OR EMPRESA.CODI_EMP = :empresa)
        AND (:grupo IS NULL OR P.CODI_GPR = :grupo)
        AND (:produto IS NULL OR UPPER(p.DESC_PSV) LIKE UPPER('%' || :produto || '%'))
    ),
    SALDO_COM_RN AS (
        SELECT
            'SIAGRI' AS SISTEMA,
            SALDO_CALCULADO.CODI_EMP AS EMPRESA,
            SALDO_CALCULADO.CODI_GPR AS GRUPO,
            SALDO_CALCULADO.codi_psv AS MATERIAL,
            SALDO_CALCULADO.DESC_PSV AS DESCRICAO,
            SALDO_CALCULADO.SITU_PSV AS STATUS,
            CAST(SALDO_CALCULADO.SALDO AS NUMBER) AS SALDO,
            ROW_NUMBER() OVER (
                PARTITION BY SALDO_CALCULADO.CODI_EMP, SALDO_CALCULADO.codi_psv 
                ORDER BY SALDO_CALCULADO.codi_psv
            ) AS RN
        FROM SALDO_CALCULADO
    ),
    SALDO_SIAGRI AS (
        SELECT * FROM SALDO_COM_RN WHERE RN = 1
    ),
    SALDO_CIGAM AS (
        SELECT
            'CIGAM11' AS SISTEMA,
            CAST(E.CD_UNIDADE_DE_N AS NUMBER) AS EMPRESA,
            CAST(NULL AS NUMBER) AS GRUPO,
            CAST(E.CD_MATERIAL AS VARCHAR2(15)) AS MATERIAL,
            CAST(M.DESCRICAO AS VARCHAR2(120)) AS DESCRICAO,
            CAST('A' AS CHAR(1)) AS STATUS,
            CAST(E.QUANTIDADE AS NUMBER) AS SALDO
        FROM CIGAM11.ESESTOQU E
        JOIN CIGAM11.ESMATERI M ON E.CD_MATERIAL = M.CD_MATERIAL
        WHERE (:empresa IS NULL OR E.CD_UNIDADE_DE_N = LPAD(:empresa, 3, '0'))
    )
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
    ORDER BY S1.EMPRESA, S1.GRUPO, S1.MATERIAL
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """
    empresa: Optional[int] = Field(None, description="Código da empresa")
    grupo: Optional[int] = Field(None, description="Código do grupo de materiais")
    subgrupo: Optional[int] = Field(None, description="Código do subgrupo de materiais")
    material: Optional[str] = Field(None, min_length=3, description="Termo de busca para material")
    apenas_divergentes: Optional[bool] = Field(False, description="Mostrar apenas itens com divergências")
    saldos_positivos_siagri: Optional[bool] = Field(False, description="Mostrar apenas saldos positivos SIAGRI")
    saldos_positivos_cigam: Optional[bool] = Field(False, description="Mostrar apenas saldos positivos CIGAM")

class PaginationParams(BaseModel):
    """
    Schema para parâmetros de paginação
    """
    page: int = Field(1, ge=1, description="Número da página")
    size: int = Field(50, ge=1, le=100, description="Tamanho da página")
    
    @property
    def offset(self) -> int:
        """Calcula o offset para a consulta SQL"""
        return (self.page - 1) * self.size

class SaldoItemSchema(BaseModel):
    """
    Schema para item de saldo no grid de resultados
    """
    empresa: Optional[int] = Field(None, description="Código da empresa")
    empresa_codigo: Optional[str] = Field(None, description="Código da empresa como string")
    empresa_descricao: Optional[str] = Field(None, description="Descrição da empresa")
    grupo: Optional[int] = Field(None, description="Código do grupo")
    grupo_codigo: Optional[str] = Field(None, description="Código do grupo como string")
    grupo_descricao: Optional[str] = Field(None, description="Descrição do grupo")
    subgrupo: Optional[int] = Field(None, description="Código do subgrupo")
    material: str = Field(..., description="Código do material")
    descricao: str = Field(..., description="Descrição do material")
    status: StatusMaterial = Field(..., description="Status do material (A/I)")
    saldo_siagri: Decimal = Field(..., description="Saldo no sistema SIAGRI")
    saldo_cigam: Decimal = Field(..., description="Saldo no sistema CIGAM")
    diferenca_saldo: Decimal = Field(..., description="Diferença entre os saldos")
    # Campos adicionais para o modal de edição
    tipo_item: Optional[str] = Field(None, description="Tipo do item")
    tipo_material: Optional[str] = Field(None, description="Tipo do material (P/S)")
    codigo_grupo: Optional[int] = Field(None, description="Código do grupo")
    codigo_subgrupo: Optional[int] = Field(None, description="Código do subgrupo")
    unidade: Optional[str] = Field(None, description="Unidade de medida")
    ncm_cla_fiscal: Optional[str] = Field(None, description="NCM/Classificação Fiscal")
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class SaldosPaginatedResponse(BaseModel):
    """
    Schema para resposta paginada de saldos
    """
    items: List[SaldoItemSchema] = Field(..., description="Lista de itens")
    total: int = Field(..., description="Total de registros")
    page: int = Field(..., description="Página atual")
    size: int = Field(..., description="Tamanho da página")
    pages: int = Field(..., description="Total de páginas")
    
    @classmethod
    def create(cls, items: List[SaldoItemSchema], total: int, page: int, size: int):
        """Factory method para criar resposta paginada"""
        pages = (total + size - 1) // size  # Ceiling division
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )

class MaterialUpdateSchema(BaseModel):
    """
    Schema para atualização de material
    Tipos validados conforme especificação do banco de dados:
    P.CODI_GPR -- NUMBER
    P.CODI_PSV -- STRING
    P.CODI_SBG -- NUMBER
    P.CODI_TIP -- NUMBER
    P.DESC_PSV -- STRING
    P.PRSE_PSV -- STRING
    P.SITU_PSV -- STRING
    P.UNID_PSV -- STRING
    """
    desc_psv: str = Field(..., max_length=120, description="P.DESC_PSV -- STRING: Descrição do material")
    situ_psv: StatusMaterial = Field(..., description="P.SITU_PSV -- STRING: Status do material (A/I)")
    unid_psv: str = Field(..., max_length=10, description="P.UNID_PSV -- STRING: Unidade do material (obrigatório)")
    codi_cfp: Optional[str] = Field(None, max_length=8, description="Código de classificação fiscal (opcional)")
    codi_gpr: Optional[int] = Field(None, description="P.CODI_GPR -- NUMBER: Código do grupo")
    codi_sbg: Optional[int] = Field(None, description="P.CODI_SBG -- NUMBER: Código do subgrupo")
    codi_tip: Optional[int] = Field(None, description="P.CODI_TIP -- NUMBER: Código do tipo")
    prse_psv: Optional[str] = Field(None, max_length=1, description="P.PRSE_PSV -- STRING: Produto/Serviço")

class MaterialResponse(BaseModel):
    """
    Schema para resposta de operações com material
    """
    success: bool = Field(..., description="Indica se a operação foi bem-sucedida")
    message: Optional[str] = Field(None, description="Mensagem adicional")
    data: Optional[dict] = Field(None, description="Dados adicionais")

class SearchMateriaisResponse(BaseModel):
    """
    Schema para resposta da busca de materiais
    """
    items: List[MaterialSchema] = Field(..., description="Lista de materiais encontrados")
    total: int = Field(..., description="Total de materiais encontrados")

class HealthCheckResponse(BaseModel):
    """
    Schema para health check da API
    """
    status: str = Field(..., description="Status da aplicação")
    database: str = Field(..., description="Status da conexão com o banco")
    redis: str = Field(..., description="Status da conexão com o cache")
    timestamp: int = Field(..., description="Timestamp da verificação")