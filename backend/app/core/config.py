from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """
    Configurações da aplicação FastAPI
    Carrega variáveis de ambiente e define valores padrão
    """
    
    # Configurações da aplicação
    app_name: str = "App Saneamento - Gestão de Saldos de Estoque"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Configurações do servidor
    host: str = "0.0.0.0"
    port: int = 7700
    
    # Configurações do banco Oracle
    oracle_user: str
    oracle_password: str
    oracle_host: str = "localhost"
    oracle_port: int = 1521
    oracle_service: str = "xe"
    
    # Configurações do Redis
    redis_host: str = "localhost"
    redis_port: int = 6789
    redis_db: int = 0
    redis_password: Optional[str] = None
    
    # Pool de conexões do banco
    db_pool_size: int = 5
    db_max_overflow: int = 20
    db_pool_timeout: int = 30
    
    # Cache TTL (em segundos)
    cache_ttl: int = 300  # 5 minutos
    
    # CORS
    backend_cors_origins: list[str] = [
        "http://localhost:8877",
        "http://127.0.0.1:8877",
        "http://frontend:8877"
    ]
    
    # Paginação
    default_page_size: int = 50
    max_page_size: int = 100
    
    @property
    def oracle_url(self) -> str:
        """
        Constrói a URL de conexão do Oracle
        """
        return f"oracle+cx_oracle://{self.oracle_user}:{self.oracle_password}@{self.oracle_host}:{self.oracle_port}/?service_name={self.oracle_service}"
    
    @property
    def redis_url(self) -> str:
        """
        Constrói a URL de conexão do Redis
        """
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instância global das configurações
settings = Settings()