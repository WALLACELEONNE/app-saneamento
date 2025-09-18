from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from loguru import logger

from ...core.database import get_db, CacheManager
from ...schemas import (
    EmpresaSchema,
    GrupoSchema,
    SubgrupoSchema,
    MaterialSchema,
    SearchMateriaisResponse
)

router = APIRouter(prefix="/filters", tags=["Filtros"])

@router.post("/clear-cache")
async def clear_filters_cache():
    """Limpa o cache dos filtros para forçar atualização dos dados"""
    try:
        # Limpa cache de empresas
        await CacheManager.delete("empresas:all")
        
        # Limpa cache de grupos (todas as páginas)
        for page in range(1, 11):  # Limpa até 10 páginas
            for size in [50, 100]:
                await CacheManager.delete(f"grupos:page:{page}:size:{size}")
        
        logger.info("Cache dos filtros limpo com sucesso")
        return {"message": "Cache limpo com sucesso", "status": "ok"}
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        return {"message": "Erro ao limpar cache", "status": "error"}

@router.get("/empresas", response_model=List[EmpresaSchema])
async def get_empresas(db: Session = Depends(get_db)):
    """
    Retorna lista de empresas disponíveis
    Utiliza cache Redis para otimizar performance
    """
    cache_key = "empresas:all"
    
    # Tenta recuperar do cache
    cached_data = await CacheManager.get(cache_key)
    if cached_data and "data" in cached_data:
        logger.info("Empresas recuperadas do cache")
        return [EmpresaSchema(**item) for item in cached_data["data"]]
    
    try:
        # Consulta no banco Oracle - apenas empresas que têm dados na consulta de saldos
        query = """
            SELECT DISTINCT E.CODI_EMP as codigo, E.IDEN_EMP as nome 
            FROM juparana.CADEMP E
            WHERE E.SITU_EMP = 'A'
            AND EXISTS (
                SELECT 1 FROM juparana.prodserv P
                WHERE P.prse_psv = 'U'
                AND P.SITU_PSV = 'A'
                AND P.CODI_GPR IN (80, 81, 82, 83, 84, 85, 86, 87)
            )
            ORDER BY E.CODI_EMP ASC
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        empresas = [
            EmpresaSchema(codigo=row.codigo, nome=row.nome, id=str(row.codigo))
            for row in rows
        ]
        
        # Armazena no cache
        empresas_dict = [empresa.model_dump() for empresa in empresas]
        await CacheManager.set(cache_key, {"data": empresas_dict})
        
        logger.info(f"Encontradas {len(empresas)} empresas")
        return empresas
        
    except Exception as e:
        logger.error(f"Erro ao buscar empresas: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/grupos", response_model=List[GrupoSchema])
async def get_grupos(
    page: int = Query(1, ge=1, description="Página (inicia em 1)"),
    size: int = Query(50, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db)
):
    """
    Retorna grupos de materiais com paginação para melhor performance
    """
    cache_key = f"grupos:page:{page}:size:{size}"
    
    # Tenta recuperar do cache
    cached_data = await CacheManager.get(cache_key)
    if cached_data and "data" in cached_data:
        logger.info(f"Grupos página {page} recuperados do cache")
        return [GrupoSchema(**item) for item in cached_data["data"]]
    
    try:
        # Calcula offset para paginação
        offset = (page - 1) * size
        
        # Consulta grupos no banco Oracle - apenas grupos que têm dados na consulta de saldos
        query = """
            SELECT DISTINCT G.CODI_GPR as codigo, G.DESC_GPR as descricao
            FROM juparana.GRUPO G
            INNER JOIN juparana.prodserv P ON G.CODI_GPR = P.CODI_GPR
            WHERE G.CODI_GPR IN (80, 81, 82, 83, 84, 85, 86, 87)
            AND G.SITU_GPR = 'A'
            AND P.prse_psv = 'U'
            AND P.SITU_PSV = 'A'
            ORDER BY G.CODI_GPR
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        grupos = [
            GrupoSchema(
                codigo=row.codigo, 
                descricao=row.descricao,
                id=str(row.codigo),
                nome=row.descricao
            )
            for row in rows
        ]
        
        # Armazena no cache por 5 minutos
        grupos_dict = [grupo.model_dump() for grupo in grupos]
        await CacheManager.set(cache_key, {"data": grupos_dict}, ttl=300)
        
        logger.info(f"Encontrados {len(grupos)} grupos na página {page}")
        return grupos
        
    except Exception as e:
        logger.error(f"Erro ao buscar grupos página {page}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/subgrupos", response_model=List[SubgrupoSchema])
async def get_subgrupos(
    grupo: int = Query(..., description="Código do grupo pai"),
    page: int = Query(1, ge=1, description="Página (inicia em 1)"),
    size: int = Query(50, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db)
):
    """
    Retorna subgrupos baseados no grupo selecionado com paginação
    """
    cache_key = f"subgrupos:grupo:{grupo}:page:{page}:size:{size}"
    
    # Tenta recuperar do cache
    cached_data = await CacheManager.get(cache_key)
    if cached_data and "data" in cached_data:
        logger.info(f"Subgrupos do grupo {grupo} página {page} recuperados do cache")
        return [SubgrupoSchema(**item) for item in cached_data["data"]]
    
    try:
        # Calcula offset para paginação
        offset = (page - 1) * size
        
        # Consulta subgrupos no banco com paginação usando ROWNUM - apenas subgrupos com materiais ativos
        query = """
            SELECT codigo, descricao FROM (
                SELECT 
                    S.CODI_SBG as codigo,
                    S.DESC_SBG as descricao,
                    ROW_NUMBER() OVER (ORDER BY S.CODI_SBG) as rn
                FROM juparana.subgrupo S
                WHERE S.CODI_GPR = :grupo
                AND S.SITU_SBG = 'A'
                AND EXISTS (
                    SELECT 1 FROM juparana.prodserv P 
                    WHERE P.CODI_SBG = S.CODI_SBG 
                    AND P.CODI_GPR = S.CODI_GPR
                    AND P.prse_psv = 'U'
                    AND P.SITU_PSV = 'A'
                )
            )
        """
        
        limit = offset + size
        result = db.execute(text(query), {
            "grupo": grupo,
            "offset": offset,
            "limit": limit
        })
        rows = result.fetchall()
        
        subgrupos = [
            SubgrupoSchema(
                codigo=row.codigo, 
                descricao=row.descricao,
                id=str(row.codigo),
                nome=row.descricao
            )
            for row in rows
        ]
        
        # Armazena no cache por 5 minutos
        subgrupos_dict = [subgrupo.model_dump() for subgrupo in subgrupos]
        await CacheManager.set(cache_key, {"data": subgrupos_dict}, ttl=300)
        
        logger.info(f"Encontrados {len(subgrupos)} subgrupos para grupo {grupo} na página {page}")
        return subgrupos
        
    except Exception as e:
        logger.error(f"Erro ao buscar subgrupos do grupo {grupo} página {page}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/materiais", response_model=List[MaterialSchema])
async def get_materiais(
    empresa_id: Optional[int] = Query(None, description="Código da empresa"),
    grupo_id: Optional[int] = Query(None, description="Código do grupo"),
    subgrupo_id: Optional[int] = Query(None, description="Código do subgrupo"),
    page: int = Query(1, ge=1, description="Página (inicia em 1)"),
    size: int = Query(50, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db)
):
    """
    Retorna materiais baseados nos filtros selecionados com paginação
    """
    # Monta a chave do cache baseada nos filtros e paginação
    cache_parts = ["materiais"]
    if empresa_id:
        cache_parts.append(f"empresa:{empresa_id}")
    if grupo_id:
        cache_parts.append(f"grupo:{grupo_id}")
    if subgrupo_id:
        cache_parts.append(f"subgrupo:{subgrupo_id}")
    cache_parts.extend([f"page:{page}", f"size:{size}"])
    
    cache_key = ":".join(cache_parts)
    
    # Tenta recuperar do cache
    cached_data = await CacheManager.get(cache_key)
    if cached_data and "data" in cached_data:
        logger.info(f"Materiais recuperados do cache: {cache_key}")
        return [MaterialSchema(**item) for item in cached_data["data"]]
    
    try:
        # Calcula offset para paginação
        offset = (page - 1) * size
        
        # Consulta materiais no banco com paginação usando ROWNUM - apenas materiais dos grupos corretos
        base_where = "WHERE p.prse_psv = 'U' AND p.SITU_PSV = 'A' AND p.CODI_GPR IN (80, 81, 82, 83, 84, 85, 86, 87)"
        
        params = {"offset": offset}
        
        # Adiciona filtros condicionais
        if grupo_id is not None:
            base_where += " AND p.CODI_GPR = :grupo_id"
            params["grupo_id"] = grupo_id
            
        if subgrupo_id is not None:
            base_where += " AND p.CODI_SBG = :subgrupo_id"
            params["subgrupo_id"] = subgrupo_id
        
        query = f"""
            SELECT * FROM (
                SELECT DISTINCT 
                    p.codi_psv as codigo,
                    p.DESC_PSV as descricao,
                    ROWNUM as rn
                FROM JUPARANA.prodserv p
                {base_where}
                ORDER BY p.DESC_PSV
            ) WHERE rn > :offset AND rn <= :limit
        """
        
        limit = offset + size
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        materiais = [
            MaterialSchema(
                codigo=row.codigo, 
                descricao=row.descricao,
                id=str(row.codigo),
                nome=row.descricao
            )
            for row in rows
        ]
        
        # Armazena no cache por 5 minutos
        materiais_dict = [material.model_dump() for material in materiais]
        await CacheManager.set(cache_key, {"data": materiais_dict}, ttl=300)
        
        logger.info(f"Encontrados {len(materiais)} materiais na página {page} com filtros aplicados")
        return materiais
        
    except Exception as e:
        logger.error(f"Erro ao buscar materiais página {page}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/materiais/search", response_model=SearchMateriaisResponse)
async def search_materiais(
    q: str = Query(..., min_length=3, description="Termo de busca (mínimo 3 caracteres)"),
    grupo: Optional[int] = Query(None, description="Filtrar por grupo"),
    subgrupo: Optional[int] = Query(None, description="Filtrar por subgrupo"),
    limit: int = Query(20, le=50, description="Limite de resultados"),
    db: Session = Depends(get_db)
):
    """
    Busca materiais por termo com autocomplete
    Suporta filtros por grupo e subgrupo
    """
    try:
        # Monta a query dinamicamente baseada nos filtros - apenas materiais dos grupos corretos
        query = """
            SELECT * FROM (
                SELECT DISTINCT 
                    p.codi_psv as codigo, 
                    p.DESC_PSV as descricao
                FROM JUPARANA.prodserv p
                WHERE UPPER(p.DESC_PSV) LIKE UPPER(:search)
                AND p.prse_psv = 'U'
                AND p.SITU_PSV = 'A'
                AND p.CODI_GPR IN (80, 81, 82, 83, 84, 85, 86, 87)
        """
        
        params = {"search": f"%{q}%", "limit": limit}
        
        # Adiciona filtros condicionais
        if grupo is not None:
            query += " AND p.CODI_GPR = :grupo"
            params["grupo"] = grupo
            
        if subgrupo is not None:
            query += " AND p.CODI_SBG = :subgrupo"
            params["subgrupo"] = subgrupo
        
        query += " ORDER BY p.DESC_PSV) WHERE ROWNUM <= :limit"
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        materiais = [
            MaterialSchema(
                codigo=row.codigo, 
                descricao=row.descricao,
                id=str(row.codigo),
                nome=row.descricao
            )
            for row in rows
        ]
        
        logger.info(f"Encontrados {len(materiais)} materiais para busca '{q}'")
        
        return SearchMateriaisResponse(
            items=materiais,
            total=len(materiais)
        )
        
    except Exception as e:
        logger.error(f"Erro ao buscar materiais com termo '{q}': {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/stats")
async def get_statistics(db: Session = Depends(get_db)):
    """
    Retorna estatísticas gerais do sistema (contadores de empresas e materiais)
    """
    cache_key = "stats:general"
    
    # Tenta recuperar do cache
    cached_data = await CacheManager.get(cache_key)
    if cached_data:
        logger.info("Estatísticas recuperadas do cache")
        return cached_data
    
    try:
        # Conta empresas ativas
        empresas_query = """
            SELECT COUNT(*) as total
            FROM juparana.CADEMP 
            WHERE SITU_EMP = 'A'
            and codi_emp not in (11,12,50,51)
        """
        
        # Conta materiais ativos dos últimos 24 meses
        materiais_query = """
            WITH PERIODO AS ( 
                SELECT 
                TRUNC(ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -23), 'MM') AS MES_INI, 
                ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1) AS MES_FIM 
                FROM DUAL 
            ) 
            SELECT COUNT(*) AS total 
            FROM JUPARANA.PRODSERV p, PERIODO per
            WHERE p.DINSERT IS NOT NULL
            AND p.DINSERT >= per.MES_INI 
            AND p.DINSERT < per.MES_FIM 
            AND p.SITU_PSV = 'A' 
            AND p.PRSE_PSV = 'U' 
            AND p.CODI_GPR IN (80,81,82,83,84,85,86,87)
        """
        
        # Executa as consultas
        empresas_result = db.execute(text(empresas_query))
        materiais_result = db.execute(text(materiais_query))
        
        total_empresas = empresas_result.fetchone().total
        total_materiais = materiais_result.fetchone().total
        
        stats = {
            "empresas": total_empresas,
            "materiais": total_materiais,
            "status": "online"
        }
        
        # Armazena no cache por 10 minutos
        await CacheManager.set(cache_key, stats, ttl=600)
        
        logger.info(f"Estatísticas: {total_empresas} empresas, {total_materiais} materiais")
        return stats
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/unidades")
async def get_unidades(db: Session = Depends(get_db)):
    """
    Busca todas as unidades de medida disponíveis
    """
    try:
        cache_key = "unidades:all"
        cached_data = await CacheManager.get(cache_key)
        
        if cached_data:
            logger.info("Retornando unidades do cache")
            return cached_data["data"]
        
        query = """
            SELECT DISTINCT p.UNID_PSV as codigo, p.UNID_PSV as descricao
            FROM JUPARANA.prodserv p
            WHERE p.UNID_PSV IS NOT NULL 
            AND p.prse_psv = 'U'
            AND p.SITU_PSV = 'A'
            ORDER BY p.UNID_PSV
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        unidades = [
            {"codigo": row.codigo, "descricao": row.descricao, "id": row.codigo, "nome": row.descricao}
            for row in rows if row.codigo
        ]
        
        # Armazena no cache por 30 minutos
        await CacheManager.set(cache_key, {"data": unidades}, ttl=1800)
        
        logger.info(f"Encontradas {len(unidades)} unidades")
        return unidades
        
    except Exception as e:
        logger.error(f"Erro ao buscar unidades: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/tipos-produto")
async def get_tipos_produto(db: Session = Depends(get_db)):
    """
    Busca todos os tipos de produto disponíveis
    """
    try:
        cache_key = "tipos_produto:all"
        cached_data = await CacheManager.get(cache_key)
        
        if cached_data:
            logger.info("Retornando tipos de produto do cache")
            return cached_data["data"]
        
        query = """
            SELECT DISTINCT p.PRSE_PSV as codigo, 
                   CASE p.PRSE_PSV 
                       WHEN 'U' THEN 'Consumo'
                       WHEN 'P' THEN 'Produto'
                       WHEN 'K' THEN 'Kit/Pacote'
                       WHEN 'B' THEN 'Bem Imobilizado'
                       WHEN 'S' THEN 'Serviço'
                       ELSE p.PRSE_PSV
                   END as descricao
            FROM JUPARANA.prodserv p
            WHERE p.PRSE_PSV IS NOT NULL 
            AND p.PRSE_PSV IN ('U', 'P', 'K', 'B', 'S')
            AND p.SITU_PSV = 'A'
            ORDER BY p.PRSE_PSV
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        tipos = [
            {"codigo": row.codigo, "descricao": row.descricao, "id": row.codigo, "nome": row.descricao}
            for row in rows if row.codigo
        ]
        
        # Armazena no cache por 30 minutos
        await CacheManager.set(cache_key, {"data": tipos}, ttl=1800)
        
        logger.info(f"Encontrados {len(tipos)} tipos de produto")
        return tipos
        
    except Exception as e:
        logger.error(f"Erro ao buscar tipos de produto: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/tipos-item")
async def get_tipos_item(db: Session = Depends(get_db)):
    """
    Busca todos os tipos de item disponíveis
    """
    try:
        cache_key = "tipos_item:all"
        cached_data = await CacheManager.get(cache_key)
        
        if cached_data:
            logger.info("Retornando tipos de item do cache")
            return cached_data["data"]
        
        query = """
            SELECT DISTINCT p.CODI_TIP as codigo, 
                   COALESCE(t.DESC_TIP, 'Tipo ' || p.CODI_TIP) as descricao
            FROM JUPARANA.prodserv p
            LEFT JOIN JUPARANA.tipoprodu t ON p.CODI_TIP = t.CODI_TIP
            WHERE p.CODI_TIP IS NOT NULL 
            AND p.prse_psv = 'U'
            AND p.SITU_PSV = 'A'
            ORDER BY p.CODI_TIP
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        tipos = [
            {"codigo": str(row.codigo), "descricao": row.descricao, "id": str(row.codigo), "nome": row.descricao}
            for row in rows if row.codigo is not None
        ]
        
        # Armazena no cache por 30 minutos
        await CacheManager.set(cache_key, {"data": tipos}, ttl=1800)
        
        logger.info(f"Encontrados {len(tipos)} tipos de item")
        return tipos
        
    except Exception as e:
        logger.error(f"Erro ao buscar tipos de item: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.delete("/cache")
async def clear_filters_cache():
    """
    Limpa o cache dos filtros (empresas, subgrupos, unidades, tipos)
    Endpoint administrativo para forçar atualização dos dados
    """
    try:
        # Limpa caches relacionados aos filtros
        await CacheManager.clear_pattern("empresas:*")
        await CacheManager.clear_pattern("subgrupos:*")
        await CacheManager.clear_pattern("stats:*")
        await CacheManager.clear_pattern("unidades:*")
        await CacheManager.clear_pattern("tipos_produto:*")
        await CacheManager.clear_pattern("tipos_item:*")
        
        logger.info("Cache de filtros limpo com sucesso")
        return {"message": "Cache limpo com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")