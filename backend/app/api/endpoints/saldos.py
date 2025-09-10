from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from decimal import Decimal
import decimal
from loguru import logger

from ...core.database import get_db, CacheManager
from ...schemas import (
    SaldosFilters,
    PaginationParams,
    SaldoItemSchema,
    SaldosPaginatedResponse,
    MaterialUpdateSchema,
    MaterialResponse,
    StatusMaterial
)

router = APIRouter(prefix="/saldos", tags=["Saldos"])

@router.get("/test")
async def test_saldos():
    """Endpoint de teste simples"""
    return {"message": "Endpoint de saldos funcionando", "status": "ok"}

@router.get("", response_model=SaldosPaginatedResponse)
async def get_saldos(
    empresa: Optional[int] = Query(None, description="Código da empresa"),
    grupo: Optional[int] = Query(None, description="Código do grupo"),
    subgrupo: Optional[int] = Query(None, description="Código do subgrupo"),
    material: Optional[str] = Query(None, min_length=3, description="Termo de busca do material"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(50, ge=1, le=100, description="Tamanho da página"),
    db: Session = Depends(get_db)
):
    """
    Consulta principal de saldos SIAGRI vs CIGAM
    Implementa a consulta SQL complexa especificada no prompt
    """
    print("DEBUG: FUNÇÃO GET_SALDOS INICIADA!")
    
    # Cria objetos de filtro e paginação
    filters = SaldosFilters(empresa=empresa, grupo=grupo, subgrupo=subgrupo, material=material)
    pagination = PaginationParams(page=page, size=size)
    print(f"DEBUG: Filtros criados: {filters}")
    print(f"DEBUG: Paginação criada: {pagination}")
    
    # Chave de cache baseada nos filtros
    cache_key = f"saldos:{filters.model_dump_json()}:{pagination.model_dump_json()}"
    
    # Temporariamente desabilitando cache para debug
    # cached_data = await CacheManager.get(cache_key)
    # if cached_data:
    #     logger.info("Saldos recuperados do cache")
    #     return SaldosPaginatedResponse(**cached_data)
    
    print(f"DEBUG: Iniciando consulta de saldos com filtros: empresa={filters.empresa}, grupo={filters.grupo}, subgrupo={filters.subgrupo}, material={filters.material}")
    print(f"DEBUG: Parâmetros de paginação: page={pagination.page}, size={pagination.size}")
    
    print("=== ENDPOINT SALDOS CHAMADO ===")
    logger.info(f"Iniciando consulta de saldos com filtros: empresa={filters.empresa}, grupo={filters.grupo}, subgrupo={filters.subgrupo}, material={filters.material}")
    logger.info(f"Parâmetros de paginação: page={pagination.page}, size={pagination.size}")
    
    # Log dos parâmetros da query
    offset = (pagination.page - 1) * pagination.size
    limit = pagination.size
    print(f"DEBUG: Parâmetros SQL: offset={offset}, limit={limit}")
    logger.debug(f"Parâmetros SQL: offset={offset}, limit={limit}")
    
    # Preparando parâmetros para a query
    params = {
        'empresa': filters.empresa,
        'grupo': filters.grupo,
        'subgrupo': filters.subgrupo,
        'material': filters.material,
        'offset': offset,
        'limit': limit
    }
    print(f"DEBUG: Parâmetros da query: {params}")
    logger.debug(f"Parâmetros da query: {params}")
    
    # Query principal com CTEs para cálculo real dos saldos
    query_saldos = """
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
    AND p.CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
    AND (:empresa IS NULL OR EMPRESA.CODI_EMP = :empresa)
    AND (:grupo IS NULL OR P.CODI_GPR = :grupo)
    AND (:subgrupo IS NULL OR P.CODI_SBG = :subgrupo)
    AND (:material IS NULL OR p.codi_psv = :material)
),
SALDO_COM_RN AS (
    SELECT
        'SIAGRI' AS SISTEMA,
        SALDO_CALCULADO.CODI_EMP AS EMPRESA,
        SALDO_CALCULADO.CODI_GPR AS GRUPO,
        SALDO_CALCULADO.codi_psv AS MATERIAL,
        SALDO_CALCULADO.DESC_PSV AS DESCRICAO,
        CASE 
            WHEN TRIM(SALDO_CALCULADO.SITU_PSV) IN ('I', 'A') THEN TRIM(SALDO_CALCULADO.SITU_PSV)
            ELSE 'A'
        END AS STATUS,
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
    WHERE (:empresa IS NULL OR E.CD_UNIDADE_DE_N = :empresa)
    AND (:material IS NULL OR E.CD_MATERIAL = :material)
),
RESULTADO_FINAL AS (
    SELECT 
        COALESCE(S.EMPRESA, C.EMPRESA) AS EMPRESA,
        COALESCE(S.GRUPO, C.GRUPO) AS GRUPO,
        COALESCE(S.MATERIAL, C.MATERIAL) AS MATERIAL,
        COALESCE(S.DESCRICAO, C.DESCRICAO) AS DESCRICAO,
        COALESCE(S.STATUS, C.STATUS) AS STATUS,
        COALESCE(S.SALDO, 0) AS SALDO_SIAGRI,
        COALESCE(C.SALDO, 0) AS SALDO_CIGAM,
        (COALESCE(S.SALDO, 0) - COALESCE(C.SALDO, 0)) AS DIFERENCA_SALDO
    FROM SALDO_SIAGRI S
    FULL OUTER JOIN SALDO_CIGAM C ON S.EMPRESA = C.EMPRESA AND S.MATERIAL = C.MATERIAL
)
SELECT * FROM (
    SELECT DISTINCT
        EMPRESA,
        GRUPO,
        MATERIAL,
        DESCRICAO,
        STATUS,
        SALDO_SIAGRI,
        SALDO_CIGAM,
        DIFERENCA_SALDO,
        ROW_NUMBER() OVER (ORDER BY EMPRESA ASC, MATERIAL) AS RN
    FROM RESULTADO_FINAL
) WHERE RN > :offset AND RN <= (:offset + :limit)
    """
        
    # Query de contagem simplificada para ser compatível com a query principal
    query_count = """
        WITH EMPRESA (CODI_EMP) AS (
            SELECT DISTINCT CODI_EMP FROM juparana.CADEMP
        )
        SELECT COUNT(*) as total
        FROM JUPARANA.prodserv p
        JOIN EMPRESA ON 1 = 1
        WHERE p.prse_psv = 'U'
        AND p.CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
        AND (:empresa IS NULL OR EMPRESA.CODI_EMP = :empresa)
        AND (:grupo IS NULL OR p.CODI_GPR = :grupo)
        AND (:subgrupo IS NULL OR p.CODI_SBG = :subgrupo)
        AND (:material IS NULL OR p.codi_psv = :material)
    """
        
    # Parâmetros da consulta (usando os já preparados)
    params_query = {
        "empresa": filters.empresa,
        "grupo": filters.grupo,
        "subgrupo": filters.subgrupo,
        "material": filters.material,
        "offset": offset,
        "limit": limit
    }
    logger.debug(f"Parâmetros finais da query: {params_query}")
    
    # Executa consulta de contagem
    print("DEBUG: Iniciando execução da query de contagem")
    logger.debug("Iniciando execução da query de contagem")
    count_result = db.execute(text(query_count), params_query)
    total = count_result.scalar_one()
    print(f"DEBUG: Query de contagem executada com sucesso. Total: {total}")
    logger.debug(f"Query de contagem executada com sucesso. Total: {total}")
    
    # Executa consulta principal
    print("DEBUG: Iniciando execução da query principal")
    logger.debug("Iniciando execução da query principal")
    result = db.execute(text(query_saldos), params_query)
    print("DEBUG: Query principal executada com sucesso")
    logger.debug("Query principal executada com sucesso")
    rows = result.fetchall()
    
    # Função auxiliar para converter valores para Decimal
    def safe_decimal(value):
        if value is None:
            return Decimal('0')
        try:
            # Remove espaços e converte para string
            str_value = str(value).strip()
            # Se estiver vazio após strip, retorna 0
            if not str_value:
                return Decimal('0')
            # Tenta converter para Decimal
            return Decimal(str_value)
        except (ValueError, TypeError, decimal.InvalidOperation):
            return Decimal('0')
    
    # Converte resultados para schemas
    items = []
    for row in rows:
        # Valida campos obrigatórios
        if row[1] is None:  # MATERIAL não pode ser None
            continue
            
        item = SaldoItemSchema(
            empresa=None,    # EMPRESA removida
            grupo=str(row[0]) if row[0] is not None else '',    # GRUPO
            material=str(row[1]), # MATERIAL
            descricao=str(row[2]) if row[2] is not None else '', # DESCRICAO
            status=StatusMaterial(row[3].strip() if row[3] and row[3].strip() in ['I', 'A'] else 'A'),   # STATUS
            saldo_siagri=safe_decimal(row[4]), # SALDO_SIAGRI
            saldo_cigam=safe_decimal(row[5]),  # SALDO_CIGAM
            diferenca_saldo=safe_decimal(row[6]) # DIFERENCA_SALDO
        )
        items.append(item)
    
    # Cria resposta paginada
    response = SaldosPaginatedResponse.create(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size
    )
    
    # Temporariamente desabilitando cache para debug
    # await CacheManager.set(cache_key, response.model_dump(), ttl=600)
    
    logger.info(f"Consulta de saldos executada: {len(items)} itens de {total} total")
    return response
        
    # Removendo try-catch temporariamente para ver o erro real
    # except Exception as e:
    #     logger.error(f"Erro ao consultar saldos: {str(e)}")
    #     logger.error(f"Tipo do erro: {type(e).__name__}")
    #     import traceback
    #     logger.error(f"Traceback completo: {traceback.format_exc()}")
    #     raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.put("/material/{codigo}", response_model=MaterialResponse)
async def update_material(
    codigo: str,
    data: MaterialUpdateSchema,
    db: Session = Depends(get_db)
):
    """
    Atualiza descrição e status de um material
    Implementa Server Action para updates otimistas
    """
    try:
        # Query de atualização
        query = """
            UPDATE JUPARANA.prodserv 
            SET DESC_PSV = :descricao, SITU_PSV = :status
            WHERE codi_psv = :codigo
        """
        
        result = db.execute(text(query), {
            "descricao": data.desc_psv,
            "status": data.situ_psv.value,
            "codigo": codigo
        })
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Material não encontrado")
        
        db.commit()
        
        # Limpa cache relacionado aos saldos
        await CacheManager.clear_pattern("saldos:*")
        
        logger.info(f"Material {codigo} atualizado com sucesso")
        
        return MaterialResponse(
            success=True,
            message=f"Material {codigo} atualizado com sucesso",
            data={
                "codigo": codigo,
                "descricao": data.desc_psv,
                "status": data.situ_psv.value
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar material {codigo}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/material/{codigo}", response_model=dict)
async def get_material_details(
    codigo: str,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes completos de um material específico
    """
    try:
        query = """
            SELECT 
                codi_psv as codigo,
                DESC_PSV as descricao,
                SITU_PSV as status,
                CODI_GPR as grupo
            FROM JUPARANA.prodserv
            WHERE codi_psv = :codigo
        """
        
        result = db.execute(text(query), {"codigo": codigo})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Material não encontrado")
        
        return {
            "codigo": row.codigo,
            "descricao": row.descricao,
            "status": row.status,
            "grupo": row.grupo
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar material {codigo}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")