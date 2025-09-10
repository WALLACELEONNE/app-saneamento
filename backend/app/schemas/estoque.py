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
    codigo: int = Field(..., description="Código da empresa")
    nome: str = Field(..., description="Nome da empresa")

class GrupoSchema(BaseModel):
    """
    SELECT CODI_GPR as codigo, DESC_GPR as descricao
    FROM juparana.GRUPO
    WHERE CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
    AND SITU_GPR = 'A'
    ORDER BY CODI_GPR
    """
    codigo: int = Field(..., description="Código do grupo")
    descricao: str = Field(..., description="Descrição do grupo")

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
    codigo: int = Field(..., description="Código do subgrupo")
    descricao: str = Field(..., description="Descrição do subgrupo")

class ProdutoSchema(BaseModel):
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
    codigo: str = Field(..., description="Código do produto")
    descricao: str = Field(..., description="Descrição do produto")

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
    grupo: Optional[int] = Field(None, description="Código do grupo de produtos")
    subgrupo: Optional[int] = Field(None, description="Código do subgrupo de materiais")
    material: Optional[str] = Field(None, min_length=3, description="Termo de busca para material")

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
    grupo: Optional[int] = Field(None, description="Código do grupo")
    material: str = Field(..., description="Código do material")
    descricao: str = Field(..., description="Descrição do material")
    status: StatusMaterial = Field(..., description="Status do material (A/I)")
    saldo_siagri: Decimal = Field(..., description="Saldo no sistema SIAGRI")
    saldo_cigam: Decimal = Field(..., description="Saldo no sistema CIGAM")
    diferenca_saldo: Decimal = Field(..., description="Diferença entre os saldos")
    
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
    """
    desc_psv: str = Field(..., max_length=120, description="Nova descrição do material")
    situ_psv: StatusMaterial = Field(..., description="Novo status do material")

class MaterialResponse(BaseModel):
    """
    Schema para resposta de operações com material
    """
    success: bool = Field(..., description="Indica se a operação foi bem-sucedida")
    message: Optional[str] = Field(None, description="Mensagem adicional")
    data: Optional[dict] = Field(None, description="Dados adicionais")

class SearchProdutosResponse(BaseModel):
    """
    Schema para resposta da busca de produtos
    """
    items: List[ProdutoSchema] = Field(..., description="Lista de produtos encontrados")
    total: int = Field(..., description="Total de produtos encontrados")

class HealthCheckResponse(BaseModel):
    """
    Schema para health check da API
    """
    status: str = Field(..., description="Status da aplicação")
    database: str = Field(..., description="Status da conexão com o banco")
    redis: str = Field(..., description="Status da conexão com o cache")
    timestamp: int = Field(..., description="Timestamp da verificação")