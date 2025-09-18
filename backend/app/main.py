from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from loguru import logger
import sys
import time

from .core.config import settings
from .core.database import init_db, close_db
from .api import api_router
from .schemas import HealthCheckResponse

# Configuração do logger
logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
    level="DEBUG"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    # Startup
    logger.info("Iniciando aplicação FastAPI")
    await init_db()
    logger.info("Conexões de banco de dados inicializadas")
    
    yield
    
    # Shutdown
    logger.info("Encerrando aplicação FastAPI")
    await close_db()
    logger.info("Conexões de banco de dados fechadas")

# Cria a aplicação FastAPI
app = FastAPI(
    title=settings.app_name,
    description="API para gestão de saldos de estoque SIAGRI vs CIGAM",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Middleware de CORS - Configuração mais permissiva para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite qualquer origem
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Middleware de compressão
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Middleware de timing
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Handler global de exceções
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_traceback = traceback.format_exc()
    logger.error(f"Erro não tratado: {exc}")
    logger.error(f"Traceback completo: {error_traceback}")
    print(f"\n=== ERRO GLOBAL CAPTURADO ===")
    print(f"URL: {request.url}")
    print(f"Método: {request.method}")
    print(f"Erro: {exc}")
    print(f"Tipo do erro: {type(exc).__name__}")
    print(f"Traceback completo:")
    print(error_traceback)
    print(f"=== FIM DO ERRO ===")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor", "error_type": type(exc).__name__, "error_message": str(exc)}
    )

# Registra os routers da API
app.include_router(api_router, prefix="/api/v1")

# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check():
    """Endpoint de verificação de saúde da aplicação"""
    try:
        from .core.database import test_db_connection, test_redis_connection
        
        # Testa conexões
        db_status = await test_db_connection()
        redis_status = await test_redis_connection()
        
        return HealthCheckResponse(
            status="healthy" if db_status and redis_status else "unhealthy",
            database="connected" if db_status else "disconnected",
            redis="connected" if redis_status else "disconnected",
            timestamp=int(time.time())
        )
    except Exception as e:
        logger.error(f"Erro no health check: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            database="disconnected",
            redis="disconnected",
            timestamp=int(time.time())
        )

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Endpoint raiz da API"""
    return {
        "message": "API de Gestão de Saldos de Estoque",
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else "Documentação disponível apenas em desenvolvimento"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=7700,
        reload=settings.debug,
        log_level="info"
    )