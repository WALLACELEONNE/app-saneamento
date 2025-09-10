from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, and_, or_
from sqlalchemy.orm import selectinload
from decimal import Decimal
from loguru import logger

from ..schemas import (
    SaldosFilters,
    PaginationParams,
    SaldoItemSchema,
    StatusMaterial
)
from ..models import (
    Empresa,
    Grupo,
    Produto,
    SaldoSiagri,
    SaldoCigam
)
from ..core.database import CacheManager

class EstoqueService:
    """Serviço para operações de estoque"""
    
    @staticmethod
    async def get_empresas(db: AsyncSession) -> List[Dict[str, Any]]:
        """Obtém lista de empresas disponíveis"""
        cache_key = "empresas:list"
        
        # Tenta recuperar do cache
        cached_data = await CacheManager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            # Usa o modelo SQLAlchemy para buscar empresas ativas
            stmt = (
                select(Empresa.codigo, Empresa.nome)
                .where(Empresa.situacao == 'A')
                .order_by(Empresa.nome)
            )
            
            result = await db.execute(stmt)
            rows = result.fetchall()
            
            empresas = [
                {"codigo": row.codigo, "nome": row.nome}
                for row in rows
            ]
            
            # Armazena no cache por 1 hora
            await CacheManager.set(cache_key, empresas, ttl=3600)
            
            return empresas
            
        except Exception as e:
            logger.error(f"Erro ao buscar empresas: {e}")
            raise
    
    @staticmethod
    async def get_grupos(db: AsyncSession) -> List[Dict[str, Any]]:
        """Obtém lista de grupos de produtos"""
        cache_key = "grupos:list"
        
        # Tenta recuperar do cache
        cached_data = await CacheManager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            # Usa o modelo SQLAlchemy para buscar grupos específicos
            stmt = (
                select(Grupo.codigo, Grupo.descricao)
                .where(Grupo.codigo.in_([80, 81, 83, 84]))
                .order_by(Grupo.descricao)
            )
            
            result = await db.execute(stmt)
            rows = result.fetchall()
            
            grupos = [
                {"codigo": row.codigo, "descricao": row.descricao}
                for row in rows
            ]
            
            # Armazena no cache por 1 hora
            await CacheManager.set(cache_key, grupos, ttl=3600)
            
            return grupos
            
        except Exception as e:
            logger.error(f"Erro ao buscar grupos: {e}")
            raise
    
    @staticmethod
    async def search_produtos(
        db: AsyncSession, 
        termo: str, 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Busca produtos por termo"""
        if len(termo) < 3:
            return []
        
        cache_key = f"produtos:search:{termo}:{limit}"
        
        # Tenta recuperar do cache
        cached_data = await CacheManager.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            # Usa o modelo SQLAlchemy para buscar produtos
            stmt = (
                select(
                    Produto.codigo,
                    Produto.descricao,
                    Produto.situacao.label('status'),
                    Produto.codigo_grupo.label('grupo')
                )
                .where(
                    and_(
                        Produto.tipo == 'U',  # Produtos únicos
                        Produto.codigo_grupo.in_([80, 81, 83, 84]),
                        func.upper(Produto.descricao).like(func.upper(f'%{termo}%'))
                    )
                )
                .order_by(Produto.descricao)
                .limit(limit)
            )
            
            result = await db.execute(stmt)
            rows = result.fetchall()
            
            produtos = [
                {
                    "codigo": row.codigo,
                    "descricao": row.descricao,
                    "status": row.status,
                    "grupo": row.grupo
                }
                for row in rows
            ]
            
            # Armazena no cache por 30 minutos
            await CacheManager.set(cache_key, produtos, ttl=1800)
            
            return produtos
            
        except Exception as e:
            logger.error(f"Erro ao buscar produtos: {e}")
            raise
    
    @staticmethod
    async def get_saldos_comparativo(
        db: AsyncSession,
        filters: SaldosFilters,
        pagination: PaginationParams
    ) -> tuple[List[SaldoItemSchema], int]:
        """Obtém comparativo de saldos SIAGRI vs CIGAM"""
        try:
            # Query principal de saldos (já implementada no endpoint)
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
            
            # Query para contar total
            query_count = """
                WITH EMPRESA (CODI_EMP) AS (
                    SELECT DISTINCT CODI_EMP FROM juparana.CADEMP
                ),
                SALDO_CALCULADO AS (
                    SELECT
                        EMPRESA.CODI_EMP,
                        P.CODI_GPR,
                        p.codi_psv,
                        COALESCE((
                            SELECT SUM(sald_ctr) 
                            FROM TABLE(JUPARANA.saldo_inicial_tipoest(
                                EMPRESA.CODI_EMP, 2, p.codi_psv, SYSDATE, 'S', NULL, NULL
                            ))
                        ), 0) AS SALDO
                    FROM JUPARANA.prodserv p
                    JOIN EMPRESA ON 1 = 1
                    WHERE p.prse_psv = 'U'
                    AND p.CODI_GPR IN (80, 81, 83, 84)
                    AND (:empresa IS NULL OR EMPRESA.CODI_EMP = :empresa)
                    AND (:grupo IS NULL OR P.CODI_GPR = :grupo)
                    AND (:produto IS NULL OR UPPER(p.DESC_PSV) LIKE UPPER('%' || :produto || '%'))
                ),
                SALDO_COM_RN AS (
                    SELECT
                        SALDO_CALCULADO.CODI_EMP AS EMPRESA,
                        SALDO_CALCULADO.codi_psv AS MATERIAL,
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
                        CAST(E.CD_MATERIAL AS VARCHAR2(15)) AS MATERIAL,
                        CAST(E.QUANTIDADE AS NUMBER) AS SALDO
                    FROM CIGAM11.ESESTOQU E
                    WHERE (:empresa IS NULL OR E.CD_UNIDADE_DE_N = LPAD(:empresa, 3, '0'))
                )
                SELECT COUNT(*) as total
                FROM SALDO_SIAGRI S1
                LEFT JOIN SALDO_CIGAM S2 ON S1.MATERIAL = S2.MATERIAL
                WHERE S1.SALDO <> COALESCE(S2.SALDO, 0)
            """
            
            # Parâmetros
            params = {
                "empresa": filters.empresa,
                "grupo": filters.grupo,
                "produto": filters.produto,
                "offset": pagination.offset,
                "limit": pagination.size
            }
            
            # Executa consultas
            count_result = await db.execute(text(query_count), params)
            total = count_result.scalar()
            
            result = await db.execute(text(query_saldos), params)
            rows = result.fetchall()
            
            # Converte para schemas
            items = []
            for row in rows:
                item = SaldoItemSchema(
                    empresa=row.EMPRESA,
                    grupo=row.GRUPO,
                    material=row.MATERIAL,
                    descricao=row.DESCRICAO,
                    status=StatusMaterial(row.STATUS),
                    saldo_siagri=Decimal(str(row.SALDO_SIAGRI)),
                    saldo_cigam=Decimal(str(row.SALDO_CIGAM)),
                    diferenca_saldo=Decimal(str(row.DIFERENCA_SALDO))
                )
                items.append(item)
            
            return items, total
            
        except Exception as e:
            logger.error(f"Erro ao buscar saldos comparativo: {e}")
            raise
    
    @staticmethod
    async def update_material(
        db: AsyncSession,
        codigo: str,
        descricao: str,
        status: StatusMaterial
    ) -> bool:
        """Atualiza material no banco usando modelo SQLAlchemy"""
        try:
            # Busca o produto pelo código
            stmt = select(Produto).where(Produto.codigo == codigo)
            result = await db.execute(stmt)
            produto = result.scalar_one_or_none()
            
            if not produto:
                logger.warning(f"Produto {codigo} não encontrado")
                return False
            
            # Atualiza os campos
            produto.descricao = descricao
            produto.situacao = status.value
            
            # Salva as alterações
            await db.commit()
            
            # Limpa cache relacionado
            await CacheManager.clear_pattern("saldos:*")
            await CacheManager.clear_pattern("produtos:*")
            
            logger.info(f"Material {codigo} atualizado com sucesso")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Erro ao atualizar material {codigo}: {e}")
            raise