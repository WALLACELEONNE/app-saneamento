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
    apenas_divergentes: Optional[bool] = Query(False, description="Mostrar apenas itens com divergências"),
    saldos_positivos_siagri: Optional[bool] = Query(False, description="Mostrar apenas saldos positivos SIAGRI"),
    saldos_positivos_cigam: Optional[bool] = Query(False, description="Mostrar apenas saldos positivos CIGAM"),
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
    filters = SaldosFilters(
        empresa=empresa, 
        grupo=grupo, 
        subgrupo=subgrupo, 
        material=material, 
        apenas_divergentes=apenas_divergentes,
        saldos_positivos_siagri=saldos_positivos_siagri,
        saldos_positivos_cigam=saldos_positivos_cigam
    )
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
WITH /*+ MATERIALIZE */
EMPRESA (CODI_EMP) AS (
    SELECT /*+ MATERIALIZE */ DISTINCT CODI_EMP FROM JUPARANA.CADEMP
),
SALDO_CALCULADO AS (
    SELECT /*+ MATERIALIZE */
        E.CODI_EMP,
        P.CODI_GPR,
        P.CODI_SBG,
        P.CODI_PSV,
        P.DESC_PSV,
        P.SITU_PSV,
        P.UNID_PSV,
        COALESCE(PD.CFIS_PRO, P.CLAS_PSV, TRIM(TO_CHAR(ES.CLASSIFICACAO_F))) AS NCM_CLA_FISCAL,
        P.CODI_TIP,
        P.PRSE_PSV,
        COALESCE((
            SELECT /*+ NO_MERGE */ SUM(SALD_CTR)
            FROM TABLE(JUPARANA.SALDO_INICIAL_TIPOEST(
                E.CODI_EMP, 2, P.CODI_PSV, SYSDATE, 'S', NULL, NULL
            ))
        ), 0) AS SALDO
    FROM JUPARANA.PRODSERV P
    JOIN EMPRESA E ON 1=1
    LEFT JOIN JUPARANA.PRODUTO PD ON PD.CODI_PSV = P.CODI_PSV
    LEFT JOIN CIGAM11.ESMATERI ES ON ES.CD_MATERIAL = P.CODI_PSV
    WHERE P.PRSE_PSV = 'U'
      AND P.CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
      AND (:empresa  IS NULL OR E.CODI_EMP = :empresa)
      AND (:grupo    IS NULL OR P.CODI_GPR = :grupo)
      AND (:subgrupo IS NULL OR P.CODI_SBG = :subgrupo)
      AND (:material IS NULL OR P.CODI_PSV = :material)
),
SALDO_SIAGRI AS (  -- corrigido: alias interno agora é "S"
    SELECT
        'SIAGRI' AS SISTEMA,
        S.CODI_EMP                        AS EMPRESA,
        LPAD(TO_CHAR(S.CODI_EMP), 3, '0') AS EMPRESA_PAD,
        S.CODI_GPR                        AS GRUPO,
        S.CODI_SBG                        AS SUBGRUPO,
        S.CODI_PSV                        AS MATERIAL,
        S.DESC_PSV                        AS DESCRICAO,
        CASE WHEN TRIM(S.SITU_PSV) IN ('I','A') THEN TRIM(S.SITU_PSV) ELSE 'A' END AS STATUS,
        S.UNID_PSV                        AS UNIDADE,
        S.NCM_CLA_FISCAL                  AS NCM_CLA_FISCAL,
        S.CODI_TIP                        AS TIPO_ITEM,
        S.CODI_GPR                        AS CODIGO_GRUPO,
        S.PRSE_PSV                        AS TIPO_MATERIAL,
        CAST(S.SALDO AS NUMBER)           AS SALDO
    FROM (
        SELECT
            SC.*,
            ROW_NUMBER() OVER (PARTITION BY SC.CODI_EMP, SC.CODI_PSV ORDER BY SC.CODI_PSV) AS RN
        FROM SALDO_CALCULADO SC
    ) S
    WHERE S.RN = 1
),
SALDO_CIGAM AS (  -- agregado para evitar duplicatas
    SELECT
        'CIGAM11' AS SISTEMA,
        LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0') AS EMPRESA_PAD,
        CAST(NULL AS NUMBER)                AS EMPRESA,
        CAST(NULL AS NUMBER)                AS GRUPO,
        CAST(NULL AS NUMBER)                AS SUBGRUPO,
        CAST(E.CD_MATERIAL AS VARCHAR2(15)) AS MATERIAL,
        CAST(MAX(M.DESCRICAO) AS VARCHAR2(120)) AS DESCRICAO,
        CAST('A' AS CHAR(1))                AS STATUS,
        CAST(NULL AS VARCHAR2(10))          AS UNIDADE,
        CAST(NULL AS VARCHAR2(20))          AS NCM_CLA_FISCAL,
        CAST(NULL AS NUMBER)                AS TIPO_ITEM,
        CAST(NULL AS NUMBER)                AS CODIGO_GRUPO,
        CAST(NULL AS VARCHAR2(1))           AS TIPO_MATERIAL,
        CAST(SUM(E.QUANTIDADE) AS NUMBER)   AS SALDO
    FROM CIGAM11.ESESTOQU E
    JOIN CIGAM11.ESMATERI M ON M.CD_MATERIAL = E.CD_MATERIAL
    WHERE (:empresa  IS NULL OR LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0') = LPAD(TO_CHAR(:empresa), 3, '0'))
      AND (:material IS NULL OR E.CD_MATERIAL = :material)
    GROUP BY LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0'), E.CD_MATERIAL
),
RESULTADO_FINAL AS (
    SELECT 
        COALESCE(S.EMPRESA, TO_NUMBER(C.EMPRESA_PAD)) AS EMPRESA,
        /* inclui padronizado para uso no front */
        COALESCE(S.EMPRESA_PAD, C.EMPRESA_PAD)        AS EMPRESA_PAD,
        COALESCE(S.GRUPO,     C.GRUPO)     AS GRUPO,
        COALESCE(S.SUBGRUPO,  C.SUBGRUPO)  AS SUBGRUPO,
        COALESCE(S.MATERIAL,  C.MATERIAL)  AS MATERIAL,
        COALESCE(S.DESCRICAO, C.DESCRICAO) AS DESCRICAO,
        COALESCE(S.STATUS,    C.STATUS)    AS STATUS,
        COALESCE(S.UNIDADE,   C.UNIDADE)   AS UNIDADE,
        COALESCE(S.NCM_CLA_FISCAL, C.NCM_CLA_FISCAL) AS NCM_CLA_FISCAL,
        COALESCE(S.TIPO_ITEM, C.TIPO_ITEM) AS TIPO_ITEM,
        COALESCE(S.CODIGO_GRUPO, C.CODIGO_GRUPO) AS CODIGO_GRUPO,
        COALESCE(S.TIPO_MATERIAL, C.TIPO_MATERIAL) AS TIPO_MATERIAL,
        COALESCE(S.SALDO, 0)               AS SALDO_SIAGRI,
        COALESCE(C.SALDO, 0)               AS SALDO_CIGAM,
        (COALESCE(S.SALDO, 0) - COALESCE(C.SALDO, 0)) AS DIFERENCA_SALDO,
        /* indicadores de origem (úteis para a UI) */
        CASE WHEN S.EMPRESA IS NOT NULL THEN 1 ELSE 0 END AS ORIGEM_SIAGRI,
        CASE WHEN C.MATERIAL IS NOT NULL THEN 1 ELSE 0 END AS ORIGEM_CIGAM
    FROM SALDO_SIAGRI S
    FULL OUTER JOIN SALDO_CIGAM C
      ON S.MATERIAL    = C.MATERIAL
     AND S.EMPRESA_PAD = C.EMPRESA_PAD
),
RESULTADO_FILTRADO AS (
    SELECT 
        EMPRESA,
        EMPRESA_PAD,
        GRUPO,
        SUBGRUPO,
        MATERIAL,
        DESCRICAO,
        STATUS,
        UNIDADE,
        NCM_CLA_FISCAL,
        TIPO_ITEM,
        CODIGO_GRUPO,
        TIPO_MATERIAL,
        SALDO_SIAGRI,
        SALDO_CIGAM,
        DIFERENCA_SALDO,
        ORIGEM_SIAGRI,
        ORIGEM_CIGAM
    FROM RESULTADO_FINAL
    WHERE 
        (:apenas_divergentes = 0 OR (:apenas_divergentes = 1 AND ABS(DIFERENCA_SALDO) > 0))
        AND (:saldos_positivos_siagri = 0 OR (:saldos_positivos_siagri = 1 AND SALDO_SIAGRI > 0))
        AND (:saldos_positivos_cigam  = 0 OR (:saldos_positivos_cigam  = 1 AND SALDO_CIGAM  > 0))
        AND (:grupo    IS NULL OR GRUPO    = :grupo)
        AND (:subgrupo IS NULL OR SUBGRUPO = :subgrupo)
        AND (
              (:saldos_positivos_siagri = 1 AND SALDO_SIAGRI > SALDO_CIGAM)
           OR (:saldos_positivos_cigam  = 1 AND SALDO_CIGAM  > SALDO_SIAGRI)
           OR (:saldos_positivos_siagri = 1 AND :saldos_positivos_cigam = 1 AND (:apenas_divergentes = 0 OR SALDO_SIAGRI <> SALDO_CIGAM))
           OR (:saldos_positivos_siagri = 0 AND :saldos_positivos_cigam = 0)
        )
)
/* Final: com paginação usando subquery */
SELECT 
    EMPRESA,
    EMPRESA_PAD,
    GRUPO,
    SUBGRUPO,
    MATERIAL,
    DESCRICAO,
    STATUS,
    UNIDADE,
    NCM_CLA_FISCAL,
    TIPO_ITEM,
    CODIGO_GRUPO,
    TIPO_MATERIAL,
    SALDO_SIAGRI,
    SALDO_CIGAM,
    DIFERENCA_SALDO,
    ORIGEM_SIAGRI,
    ORIGEM_CIGAM
FROM (
    SELECT 
        RF.*,
        ROW_NUMBER() OVER (ORDER BY EMPRESA ASC, MATERIAL) AS RN
    FROM RESULTADO_FILTRADO RF
) 
WHERE RN > :offset 
  AND RN <= (:offset + :limit)
    """
        
    # Query de contagem que replica a lógica da query principal
    query_count = """
WITH /*+ MATERIALIZE */
EMPRESA (CODI_EMP) AS (
    SELECT /*+ MATERIALIZE */ DISTINCT CODI_EMP FROM JUPARANA.CADEMP
),
SALDO_CALCULADO AS (
    SELECT /*+ MATERIALIZE */
        E.CODI_EMP,
        P.CODI_GPR,
        P.CODI_SBG,
        P.CODI_PSV,
        P.DESC_PSV,
        P.SITU_PSV,
        P.UNID_PSV,
        COALESCE(PD.CFIS_PRO, P.CLAS_PSV, TRIM(TO_CHAR(ES.CLASSIFICACAO_F))) AS NCM_CLA_FISCAL,
        P.CODI_TIP,
        P.PRSE_PSV,
        COALESCE((
            SELECT /*+ NO_MERGE */ SUM(SALD_CTR)
            FROM TABLE(JUPARANA.SALDO_INICIAL_TIPOEST(
                E.CODI_EMP, 2, P.CODI_PSV, SYSDATE, 'S', NULL, NULL
            ))
        ), 0) AS SALDO
    FROM JUPARANA.PRODSERV P
    JOIN EMPRESA E ON 1=1
    LEFT JOIN JUPARANA.PRODUTO PD ON PD.CODI_PSV = P.CODI_PSV
    LEFT JOIN CIGAM11.ESMATERI ES ON ES.CD_MATERIAL = P.CODI_PSV
    WHERE P.PRSE_PSV = 'U'
      AND P.CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
      AND (:empresa  IS NULL OR E.CODI_EMP = :empresa)
      AND (:grupo    IS NULL OR P.CODI_GPR = :grupo)
      AND (:subgrupo IS NULL OR P.CODI_SBG = :subgrupo)
      AND (:material IS NULL OR P.CODI_PSV = :material)
),
SALDO_SIAGRI AS (
    SELECT
        'SIAGRI' AS SISTEMA,
        S.CODI_EMP                        AS EMPRESA,
        LPAD(TO_CHAR(S.CODI_EMP), 3, '0') AS EMPRESA_PAD,
        S.CODI_GPR                        AS GRUPO,
        S.CODI_SBG                        AS SUBGRUPO,
        S.CODI_PSV                        AS MATERIAL,
        S.DESC_PSV                        AS DESCRICAO,
        CASE WHEN TRIM(S.SITU_PSV) IN ('I','A') THEN TRIM(S.SITU_PSV) ELSE 'A' END AS STATUS,
        S.UNID_PSV                        AS UNIDADE,
        S.NCM_CLA_FISCAL                  AS NCM_CLA_FISCAL,
        S.CODI_TIP                        AS TIPO_ITEM,
        S.CODI_GPR                        AS CODIGO_GRUPO,
        S.PRSE_PSV                        AS TIPO_MATERIAL,
        CAST(S.SALDO AS NUMBER)           AS SALDO
    FROM (
        SELECT
            SC.*,
            ROW_NUMBER() OVER (PARTITION BY SC.CODI_EMP, SC.CODI_PSV ORDER BY SC.CODI_PSV) AS RN
        FROM SALDO_CALCULADO SC
    ) S
    WHERE S.RN = 1
),
SALDO_CIGAM AS (
    SELECT
        'CIGAM11' AS SISTEMA,
        LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0') AS EMPRESA_PAD,
        CAST(NULL AS NUMBER)                AS EMPRESA,
        CAST(NULL AS NUMBER)                AS GRUPO,
        CAST(NULL AS NUMBER)                AS SUBGRUPO,
        CAST(E.CD_MATERIAL AS VARCHAR2(15)) AS MATERIAL,
        CAST(MAX(M.DESCRICAO) AS VARCHAR2(120)) AS DESCRICAO,
        CAST('A' AS CHAR(1))                AS STATUS,
        CAST(NULL AS VARCHAR2(10))          AS UNIDADE,
        CAST(NULL AS VARCHAR2(20))          AS NCM_CLA_FISCAL,
        CAST(NULL AS NUMBER)                AS TIPO_ITEM,
        CAST(NULL AS NUMBER)                AS CODIGO_GRUPO,
        CAST(NULL AS VARCHAR2(1))           AS TIPO_MATERIAL,
        CAST(SUM(E.QUANTIDADE) AS NUMBER)   AS SALDO
    FROM CIGAM11.ESESTOQU E
    JOIN CIGAM11.ESMATERI M ON M.CD_MATERIAL = E.CD_MATERIAL
    WHERE (:empresa  IS NULL OR LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0') = LPAD(TO_CHAR(:empresa), 3, '0'))
      AND (:material IS NULL OR E.CD_MATERIAL = :material)
    GROUP BY LPAD(TO_CHAR(TRIM(E.CD_UNIDADE_DE_N)), 3, '0'), E.CD_MATERIAL
),
RESULTADO_FINAL AS (
    SELECT 
        COALESCE(S.EMPRESA, TO_NUMBER(C.EMPRESA_PAD)) AS EMPRESA,
        COALESCE(S.EMPRESA_PAD, C.EMPRESA_PAD)        AS EMPRESA_PAD,
        COALESCE(S.GRUPO,     C.GRUPO)     AS GRUPO,
        COALESCE(S.SUBGRUPO,  C.SUBGRUPO)  AS SUBGRUPO,
        COALESCE(S.MATERIAL,  C.MATERIAL)  AS MATERIAL,
        COALESCE(S.DESCRICAO, C.DESCRICAO) AS DESCRICAO,
        COALESCE(S.STATUS,    C.STATUS)    AS STATUS,
        COALESCE(S.UNIDADE,   C.UNIDADE)   AS UNIDADE,
        COALESCE(S.NCM_CLA_FISCAL, C.NCM_CLA_FISCAL) AS NCM_CLA_FISCAL,
        COALESCE(S.TIPO_ITEM, C.TIPO_ITEM) AS TIPO_ITEM,
        COALESCE(S.CODIGO_GRUPO, C.CODIGO_GRUPO) AS CODIGO_GRUPO,
        COALESCE(S.TIPO_MATERIAL, C.TIPO_MATERIAL) AS TIPO_MATERIAL,
        COALESCE(S.SALDO, 0)               AS SALDO_SIAGRI,
        COALESCE(C.SALDO, 0)               AS SALDO_CIGAM,
        (COALESCE(S.SALDO, 0) - COALESCE(C.SALDO, 0)) AS DIFERENCA_SALDO,
        CASE WHEN S.EMPRESA IS NOT NULL THEN 1 ELSE 0 END AS ORIGEM_SIAGRI,
        CASE WHEN C.MATERIAL IS NOT NULL THEN 1 ELSE 0 END AS ORIGEM_CIGAM
    FROM SALDO_SIAGRI S
    FULL OUTER JOIN SALDO_CIGAM C
      ON S.MATERIAL    = C.MATERIAL
     AND S.EMPRESA_PAD = C.EMPRESA_PAD
)
SELECT COUNT(*) AS total
FROM RESULTADO_FINAL
WHERE 
    (:apenas_divergentes = 0 OR (:apenas_divergentes = 1 AND ABS(DIFERENCA_SALDO) > 0))
    AND (:saldos_positivos_siagri = 0 OR (:saldos_positivos_siagri = 1 AND SALDO_SIAGRI > 0))
    AND (:saldos_positivos_cigam  = 0 OR (:saldos_positivos_cigam  = 1 AND SALDO_CIGAM  > 0))
    AND (:grupo    IS NULL OR GRUPO    = :grupo)
    AND (:subgrupo IS NULL OR SUBGRUPO = :subgrupo)
    AND (
          (:saldos_positivos_siagri = 1 AND SALDO_SIAGRI > SALDO_CIGAM)
       OR (:saldos_positivos_cigam  = 1 AND SALDO_CIGAM  > SALDO_SIAGRI)
       OR (:saldos_positivos_siagri = 1 AND :saldos_positivos_cigam = 1 AND (:apenas_divergentes = 0 OR SALDO_SIAGRI <> SALDO_CIGAM))
       OR (:saldos_positivos_siagri = 0 AND :saldos_positivos_cigam = 0)
    )
    """
        
    # Parâmetros da consulta (usando os já preparados)
    params_query = {
        "empresa": filters.empresa,
        "grupo": filters.grupo,
        "subgrupo": filters.subgrupo,
        "material": filters.material,
        "apenas_divergentes": 1 if filters.apenas_divergentes else 0,
        "saldos_positivos_siagri": 1 if filters.saldos_positivos_siagri else 0,
        "saldos_positivos_cigam": 1 if filters.saldos_positivos_cigam else 0,
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
        if row[4] is None:  # MATERIAL não pode ser None (row[4])
            continue
            
        item = SaldoItemSchema(
            empresa=None,    # EMPRESA removida
            grupo=int(row[2]) if row[2] is not None and str(row[2]).strip() != '' else None,    # GRUPO (row[2])
            subgrupo=int(row[3]) if row[3] is not None and str(row[3]).strip() != '' else None,  # SUBGRUPO (row[3])
            material=str(row[4]), # MATERIAL (row[4])
            descricao=str(row[5]) if row[5] is not None else '', # DESCRICAO (row[5])
            status=StatusMaterial(str(row[6]).strip() if row[6] and str(row[6]).strip() in ['I', 'A'] else 'A'),   # STATUS (row[6])
            unidade=str(row[7]) if row[7] is not None else '',  # UNIDADE (row[7])
            ncm_cla_fiscal=str(row[8]) if row[8] is not None else '', # NCM_CLA_FISCAL (row[8])
            tipo_item=str(row[9]) if row[9] is not None else '', # TIPO_ITEM (row[9])
            codigo_grupo=int(row[10]) if row[10] is not None and str(row[10]).strip() != '' else None, # CODIGO_GRUPO (row[10])
            codigo_subgrupo=int(row[3]) if row[3] is not None and str(row[3]).strip() != '' else None, # CODIGO_SUBGRUPO (row[3])
            tipo_material=str(row[11]) if row[11] is not None else '', # TIPO_MATERIAL (row[11])
            saldo_siagri=safe_decimal(row[12]), # SALDO_SIAGRI (row[12])
            saldo_cigam=safe_decimal(row[13]),  # SALDO_CIGAM (row[13])
            diferenca_saldo=safe_decimal(row[14]) # DIFERENCA_SALDO (row[14])
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
        # Query de atualização - PRODSERV
        update_prodserv_query = """
            UPDATE JUPARANA.PRODSERV 
            SET DESC_PSV = :desc_psv,
                SITU_PSV = :situ_psv,
                CLAS_PSV = :clas_psv
            WHERE CODI_PSV = :codigo
        """
        
        # Query de atualização - PRODUTO (NCM)
        update_produto_query = """
            UPDATE JUPARANA.PRODUTO 
            SET CFIS_PRO = :ncm_cla_fiscal
            WHERE CODI_PSV = :codigo
        """
        
        # Query de atualização - CIGAM11.ESMATERI (CLASSIFICACAO_F - PRIORITÁRIO)
        update_cigam_query = """
            UPDATE CIGAM11.ESMATERI 
            SET CLASSIFICACAO_F = :ncm_classificacao
            WHERE CD_MATERIAL = :codigo
        """
        
        # Parâmetros para as queries
        params_prodserv = {
            'codigo': codigo,
            'desc_psv': data.desc_psv,
            'situ_psv': data.situ_psv.value,
            'clas_psv': data.clas_psv
        }
        
        params_produto = {
            'codigo': codigo,
            'ncm_cla_fiscal': data.codi_cfp  # Usar o campo correto para NCM
        }
        
        params_cigam = {
            'codigo': codigo,
            'ncm_classificacao': data.codi_cfp  # Usar o campo correto para NCM
        }
        
        # Executa atualização na tabela PRODSERV
        result_prodserv = db.execute(text(update_prodserv_query), params_prodserv)
        
        # Executa atualização PRIORITÁRIA na tabela CIGAM11.ESMATERI (se NCM foi fornecido)
        if data.codi_cfp:
            db.execute(text(update_cigam_query), params_cigam)
        
        # Executa atualização na tabela PRODUTO (se NCM foi fornecido)
        if data.codi_cfp:
            db.execute(text(update_produto_query), params_produto)
        
        result = result_prodserv
        
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
    Inclui todos os campos necessários para edição no modal
    """
    try:
        query = """
            SELECT 
                P.CODI_PSV as codigo,
                P.DESC_PSV as descricao,
                P.SITU_PSV as status,
                P.CODI_GPR as grupo,
                P.CODI_TIP as tipo_item,
                P.PRSE_PSV as tipo_material,
                P.CODI_GPR as codigo_grupo,
                P.CODI_SBG as codigo_subgrupo,
                P.UNID_PSV as unidade,
                COALESCE(PD.CFIS_PRO, P.CLAS_PSV) as ncm_cla_fiscal
            FROM JUPARANA.PRODSERV P
            LEFT JOIN JUPARANA.PRODUTO PD ON PD.CODI_PSV = P.CODI_PSV
            WHERE P.CODI_PSV = :codigo
        """
        
        result = db.execute(text(query), {"codigo": codigo})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Material não encontrado")
        
        return {
            "codigo": row.codigo,
            "descricao": row.descricao,
            "status": row.status,
            "grupo": row.grupo,
            "tipo_item": str(row.tipo_item) if row.tipo_item else None,
            "tipo_material": row.tipo_material,
            "codigo_grupo": row.codigo_grupo,
            "codigo_subgrupo": row.codigo_subgrupo,
            "unidade": row.unidade,
            "ncm_cla_fiscal": row.ncm_cla_fiscal
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar material {codigo}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")