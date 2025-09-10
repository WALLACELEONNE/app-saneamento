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
    ProdutoSchema,
    SearchProdutosResponse
)

router = APIRouter(prefix="/filters", tags=["Filtros"])

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
        # Consulta no banco Oracle
        query = """
            SELECT CODI_EMP as codigo, IDEN_EMP as nome 
            FROM juparana.CADEMP 
            WHERE SITU_EMP = 'A'
            ORDER BY IDEN_EMP
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        empresas = [
            EmpresaSchema(codigo=row.codigo, nome=row.nome)
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
    Retorna grupos de produtos com paginação para melhor performance
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
        
        # Consulta grupos no banco Oracle (simplificada para teste)
        query = """
            SELECT CODI_GPR as codigo, DESC_GPR as descricao
            FROM juparana.GRUPO
            WHERE CODI_GPR IN (80, 81, 83, 84, 85, 86, 87)
            AND SITU_GPR = 'A'
            ORDER BY CODI_GPR
        """
        
        result = db.execute(text(query))
        rows = result.fetchall()
        
        grupos = [
            GrupoSchema(codigo=row.codigo, descricao=row.descricao)
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
        
        # Consulta subgrupos no banco com paginação usando ROWNUM
        query = """
            SELECT * FROM (
                SELECT DISTINCT 
                    CODI_SBG as codigo,
                    DESC_SBG as descricao,
                    ROWNUM as rn
                FROM juparana.subgrupo
                WHERE CODI_GPR = :grupo
                AND SITU_SBG = 'A'
                ORDER BY DESC_SBG
            ) WHERE rn > :offset AND rn <= :limit
        """
        
        limit = offset + size
        result = db.execute(text(query), {
            "grupo": grupo,
            "offset": offset,
            "limit": limit
        })
        rows = result.fetchall()
        
        subgrupos = [
            SubgrupoSchema(codigo=row.codigo, descricao=row.descricao)
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

@router.get("/produtos", response_model=List[ProdutoSchema])
async def get_produtos(
    empresa_id: Optional[int] = Query(None, description="Código da empresa"),
    grupo_id: Optional[int] = Query(None, description="Código do grupo"),
    subgrupo_id: Optional[int] = Query(None, description="Código do subgrupo"),
    page: int = Query(1, ge=1, description="Página (inicia em 1)"),
    size: int = Query(50, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db)
):
    """
    Retorna produtos baseados nos filtros selecionados com paginação
    """
    # Monta a chave do cache baseada nos filtros e paginação
    cache_parts = ["produtos"]
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
        logger.info(f"Produtos recuperados do cache: {cache_key}")
        return [ProdutoSchema(**item) for item in cached_data["data"]]
    
    try:
        # Calcula offset para paginação
        offset = (page - 1) * size
        
        # Consulta produtos no banco com paginação usando ROWNUM
        query = """
            SELECT * FROM (
                SELECT DISTINCT 
                    p.codi_psv as codigo,
                    p.DESC_PSV as descricao,
                    ROWNUM as rn
                FROM JUPARANA.prodserv p
                WHERE p.prse_psv = 'U'
                AND p.SITU_PSV = 'A'
        """
        
        params = {"offset": offset}
        
        # Adiciona filtros condicionais
        if grupo_id is not None:
            query += " AND p.CODI_GPR = :grupo_id"
            params["grupo_id"] = grupo_id
            
        if subgrupo_id is not None:
            query += " AND p.CODI_SBG = :subgrupo_id"
            params["subgrupo_id"] = subgrupo_id
        
        query += " ORDER BY p.DESC_PSV) WHERE rn > :offset AND rn <= :limit"
        
        limit = offset + size
        params["limit"] = limit
        
        result = db.execute(text(query), params)
        rows = result.fetchall()
        
        produtos = [
            ProdutoSchema(codigo=row.codigo, descricao=row.descricao)
            for row in rows
        ]
        
        # Armazena no cache por 5 minutos
        produtos_dict = [produto.model_dump() for produto in produtos]
        await CacheManager.set(cache_key, {"data": produtos_dict}, ttl=300)
        
        logger.info(f"Encontrados {len(produtos)} produtos na página {page} com filtros aplicados")
        return produtos
        
    except Exception as e:
        logger.error(f"Erro ao buscar produtos página {page}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/produtos/search", response_model=SearchProdutosResponse)
async def search_produtos(
    q: str = Query(..., min_length=3, description="Termo de busca (mínimo 3 caracteres)"),
    grupo: Optional[int] = Query(None, description="Filtrar por grupo"),
    subgrupo: Optional[int] = Query(None, description="Filtrar por subgrupo"),
    limit: int = Query(20, le=50, description="Limite de resultados"),
    db: Session = Depends(get_db)
):
    """
    Busca produtos por termo com autocomplete
    Suporta filtros por grupo e subgrupo
    """
    try:
        # Monta a query dinamicamente baseada nos filtros
        query = """
            SELECT DISTINCT 
                p.codi_psv as codigo, 
                p.DESC_PSV as descricao
            FROM JUPARANA.prodserv p
            WHERE UPPER(p.DESC_PSV) LIKE UPPER(:search)
            AND p.prse_psv = 'U'
            AND p.SITU_PSV = 'A'
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
        
        produtos = [
            ProdutoSchema(codigo=row.codigo, descricao=row.descricao)
            for row in rows
        ]
        
        logger.info(f"Encontrados {len(produtos)} produtos para busca '{q}'")
        
        return SearchProdutosResponse(
            items=produtos,
            total=len(produtos)
        )
        
    except Exception as e:
        logger.error(f"Erro ao buscar produtos com termo '{q}': {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.delete("/cache")
async def clear_filters_cache():
    """
    Limpa o cache dos filtros (empresas, subgrupos)
    Endpoint administrativo para forçar atualização dos dados
    """
    try:
        # Limpa caches relacionados aos filtros
        await CacheManager.clear_pattern("empresas:*")
        await CacheManager.clear_pattern("subgrupos:*")
        
        logger.info("Cache de filtros limpo com sucesso")
        return {"message": "Cache limpo com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")