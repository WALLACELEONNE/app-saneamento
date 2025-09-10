import cx_Oracle
from sqlalchemy import create_engine, text, MetaData, event
from sqlalchemy.dialects import oracle
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import AsyncGenerator
import redis.asyncio as redis
from .config import settings
import json
from loguru import logger
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configurar cx_Oracle com Oracle Instant Client
# cx_Oracle tem melhor compatibilidade com versões antigas do Oracle
logger.info("Usando cx_Oracle com Oracle Instant Client")

class Base(DeclarativeBase):
    """
    Classe base para todos os modelos SQLAlchemy
    """
    pass

# Engine síncrono do SQLAlchemy com pool de conexões
engine = create_engine(
    settings.oracle_url,
    poolclass=NullPool,  # Usar NullPool para evitar problemas de conexão
    echo=settings.debug
)

# Configurar pool de conexões para cx_Oracle
@event.listens_for(engine, "connect")
def set_oracle_session_info(dbapi_connection, connection_record):
    """Configurar sessão Oracle para cx_Oracle"""
    try:
        with dbapi_connection.cursor() as cursor:
            # Configurar formato de data
            cursor.execute("ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS'")
            # Configurar charset
            cursor.execute("ALTER SESSION SET NLS_LANGUAGE = 'AMERICAN'")
            cursor.execute("ALTER SESSION SET NLS_TERRITORY = 'AMERICA'")
            logger.debug("Sessão Oracle configurada com cx_Oracle")
    except cx_Oracle.Error as e:
        logger.error(f"Erro ao configurar sessão Oracle: {e}")
        raise

# Session factory síncrona
SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False
)

# Thread pool para operações assíncronas
thread_pool = ThreadPoolExecutor(max_workers=10)

# Cliente Redis para cache
redis_client = redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True
)

async def get_db() -> AsyncGenerator[Session, None]:
    """
    Dependency para obter sessão do banco de dados
    Gerencia automaticamente o ciclo de vida da sessão
    """
    def _get_session():
        session = SessionLocal()
        try:
            return session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    session = SessionLocal()
    try:
        yield session
    except Exception as e:
        session.rollback()
        logger.error(f"Erro na sessão do banco: {e}")
        raise
    finally:
        session.close()

async def get_redis() -> redis.Redis:
    """
    Dependency para obter cliente Redis
    """
    return redis_client

class CacheManager:
    """
    Gerenciador de cache Redis com métodos utilitários
    """
    
    @staticmethod
    async def get(key: str) -> dict | None:
        """
        Recupera dados do cache
        """
        try:
            data = await redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Erro ao recuperar cache {key}: {e}")
            return None
    
    @staticmethod
    async def set(key: str, value: dict, ttl: int = settings.cache_ttl) -> bool:
        """
        Armazena dados no cache
        """
        try:
            await redis_client.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.warning(f"Erro ao armazenar cache {key}: {e}")
            return False
    
    @staticmethod
    async def delete(key: str) -> bool:
        """
        Remove dados do cache
        """
        try:
            await redis_client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Erro ao deletar cache {key}: {e}")
            return False
    
    @staticmethod
    async def clear_pattern(pattern: str) -> int:
        """
        Remove todas as chaves que correspondem ao padrão
        """
        try:
            keys = await redis_client.keys(pattern)
            if keys:
                return await redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Erro ao limpar cache com padrão {pattern}: {e}")
            return 0

# Funções de inicialização e teste
async def init_db():
    """Inicializa conexões de banco de dados"""
    try:
        logger.info("Tentando conectar ao banco Oracle...")
        
        # Testa conexão com Oracle usando thread pool com timeout
        def _test_oracle():
            with engine.begin() as conn:
                conn.execute(text("SELECT 1 FROM DUAL"))
        
        # Timeout de 5 segundos para não travar a inicialização
        await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(thread_pool, _test_oracle),
            timeout=5.0
        )
        logger.info("Conexão Oracle inicializada com sucesso")
        
        # Testa conexão com Redis
        await redis_client.ping()
        logger.info("Conexão Redis inicializada com sucesso")
        
    except Exception as e:
        logger.warning(f"Não foi possível conectar ao Oracle: {e}")
        logger.info("Aplicação iniciará sem conexão com banco (modo desenvolvimento)")
        # Não levanta exceção para permitir que a aplicação inicie

async def close_db():
    """Fecha conexões de banco de dados"""
    try:
        def _close_engine():
            engine.dispose()
        
        await asyncio.get_event_loop().run_in_executor(
            thread_pool, _close_engine
        )
        await redis_client.close()
        logger.info("Conexões fechadas com sucesso")
    except Exception as e:
        logger.error(f"Erro ao fechar conexões: {e}")

async def test_db_connection() -> bool:
    """Testa conexão com Oracle"""
    try:
        def _test_connection():
            with engine.begin() as conn:
                conn.execute(text("SELECT 1 FROM DUAL"))
            return True
        
        result = await asyncio.get_event_loop().run_in_executor(
            thread_pool, _test_connection
        )
        return result
    except Exception as e:
        logger.error(f"Erro na conexão Oracle: {e}")
        return False

async def test_redis_connection() -> bool:
    """Testa conexão com Redis"""
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.error(f"Erro na conexão Redis: {e}")
        return False

async def test_connections():
    """
    Testa as conexões com Oracle e Redis
    """
    # Teste Oracle
    try:
        def _test_oracle():
            with SessionLocal() as session:
                result = session.execute(text("SELECT 1 FROM DUAL"))
                return result.scalar()
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(thread_pool, _test_oracle)
        logger.info("✅ Conexão Oracle OK")
    except Exception as e:
        logger.error(f"❌ Erro na conexão Oracle: {e}")
        raise
    
    # Teste Redis
    try:
        await redis_client.ping()
        logger.info("✅ Conexão Redis OK")
    except Exception as e:
        logger.error(f"❌ Erro na conexão Redis: {e}")
        raise


async def create_tables():
    """
    Cria todas as tabelas no banco Oracle
    Importa os modelos para garantir que estejam registrados
    """
    try:
        # Importa todos os modelos para registrá-los no Base.metadata
        from ..models import (
            Empresa, Grupo, Subgrupo, Produto,
            SaldoSiagri, SaldoCigam, HistoricoMovimentacao
        )
        
        logger.info("Criando tabelas no banco Oracle...")
        
        async with engine.begin() as conn:
            # Cria todas as tabelas definidas nos modelos
            await conn.run_sync(Base.metadata.create_all)
            
        logger.info("✅ Tabelas criadas com sucesso no Oracle")
        
    except Exception as e:
        logger.error(f"❌ Erro ao criar tabelas: {e}")
        raise


async def drop_tables():
    """
    Remove todas as tabelas do banco Oracle
    CUIDADO: Esta operação é irreversível!
    """
    try:
        # Importa todos os modelos para registrá-los no Base.metadata
        from ..models import (
            Empresa, Grupo, Subgrupo, Produto,
            SaldoSiagri, SaldoCigam, HistoricoMovimentacao
        )
        
        logger.warning("Removendo todas as tabelas do banco Oracle...")
        
        async with engine.begin() as conn:
            # Remove todas as tabelas definidas nos modelos
            await conn.run_sync(Base.metadata.drop_all)
            
        logger.info("✅ Tabelas removidas com sucesso do Oracle")
        
    except Exception as e:
        logger.error(f"❌ Erro ao remover tabelas: {e}")
        raise


async def check_tables_exist() -> bool:
    """
    Verifica se as tabelas principais existem no banco Oracle
    """
    try:
        def _check_tables():
            with SessionLocal() as session:
                # Verifica se a tabela empresas existe
                result = session.execute(text(
                    "SELECT COUNT(*) FROM user_tables WHERE table_name = 'EMPRESAS'"
                ))
                return result.scalar()
        
        loop = asyncio.get_event_loop()
        count = await loop.run_in_executor(thread_pool, _check_tables)
        
        if count > 0:
            logger.info("✅ Tabelas encontradas no Oracle")
            return True
        else:
            logger.warning("⚠️ Tabelas não encontradas no Oracle")
            return False
                
    except Exception as e:
        logger.error(f"❌ Erro ao verificar tabelas: {e}")
        return False


async def get_table_info():
    """
    Retorna informações sobre as tabelas no schema atual
    """
    try:
        def _get_tables():
            with SessionLocal() as session:
                # Lista todas as tabelas do usuário atual
                result = session.execute(text(
                    "SELECT table_name, num_rows FROM user_tables ORDER BY table_name"
                ))
                return result.fetchall()
        
        loop = asyncio.get_event_loop()
        tables = await loop.run_in_executor(thread_pool, _get_tables)
        
        logger.info("📋 Tabelas no schema atual:")
        for table in tables:
            logger.info(f"  - {table.table_name}: {table.num_rows or 0} registros")
            
        return tables
            
    except Exception as e:
        logger.error(f"❌ Erro ao obter informações das tabelas: {e}")
        return []