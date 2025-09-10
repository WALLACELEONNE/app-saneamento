#!/usr/bin/env python3
"""
Script de migração para gerenciar tabelas Oracle
Uso: python migrate.py [create|drop|check|info]
"""

import asyncio
import sys
from pathlib import Path

# Adiciona o diretório do projeto ao path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import (
    create_tables,
    drop_tables,
    check_tables_exist,
    get_table_info,
    test_connections,
    init_db,
    close_db
)
from loguru import logger


async def main():
    """
    Função principal do script de migração
    """
    if len(sys.argv) != 2:
        print("Uso: python migrate.py [create|drop|check|info|test]")
        print("")
        print("Comandos disponíveis:")
        print("  create  - Cria todas as tabelas no banco Oracle")
        print("  drop    - Remove todas as tabelas do banco Oracle (CUIDADO!)")
        print("  check   - Verifica se as tabelas existem")
        print("  info    - Mostra informações sobre as tabelas")
        print("  test    - Testa as conexões com Oracle e Redis")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    try:
        # Inicializa as conexões
        await init_db()
        logger.info(f"Executando comando: {command}")
        
        if command == "create":
            await create_tables_command()
        elif command == "drop":
            await drop_tables_command()
        elif command == "check":
            await check_tables_command()
        elif command == "info":
            await info_tables_command()
        elif command == "test":
            await test_connections_command()
        else:
            logger.error(f"Comando desconhecido: {command}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Erro durante execução: {e}")
        sys.exit(1)
    finally:
        # Fecha as conexões
        await close_db()


async def create_tables_command():
    """
    Comando para criar tabelas
    """
    logger.info("🚀 Iniciando criação de tabelas...")
    
    # Verifica se as tabelas já existem
    if await check_tables_exist():
        response = input("⚠️ Tabelas já existem. Deseja continuar? (s/N): ")
        if response.lower() not in ['s', 'sim', 'y', 'yes']:
            logger.info("Operação cancelada pelo usuário")
            return
    
    await create_tables()
    logger.info("✅ Criação de tabelas concluída")


async def drop_tables_command():
    """
    Comando para remover tabelas
    """
    logger.warning("⚠️ ATENÇÃO: Esta operação irá remover TODAS as tabelas!")
    response = input("Tem certeza que deseja continuar? Digite 'CONFIRMAR' para prosseguir: ")
    
    if response != "CONFIRMAR":
        logger.info("Operação cancelada pelo usuário")
        return
    
    logger.info("🗑️ Iniciando remoção de tabelas...")
    await drop_tables()
    logger.info("✅ Remoção de tabelas concluída")


async def check_tables_command():
    """
    Comando para verificar se as tabelas existem
    """
    logger.info("🔍 Verificando existência das tabelas...")
    exists = await check_tables_exist()
    
    if exists:
        logger.info("✅ Tabelas encontradas no banco Oracle")
    else:
        logger.warning("❌ Tabelas não encontradas no banco Oracle")
        logger.info("💡 Execute 'python migrate.py create' para criar as tabelas")


async def info_tables_command():
    """
    Comando para mostrar informações das tabelas
    """
    logger.info("📊 Obtendo informações das tabelas...")
    tables = await get_table_info()
    
    if not tables:
        logger.warning("Nenhuma tabela encontrada no schema atual")
    else:
        logger.info(f"Total de tabelas encontradas: {len(tables)}")


async def test_connections_command():
    """
    Comando para testar conexões
    """
    logger.info("🔌 Testando conexões...")
    await test_connections()
    logger.info("✅ Teste de conexões concluído")


if __name__ == "__main__":
    # Configura o logger
    logger.remove()
    logger.add(
        sys.stdout,
        format="{time:HH:mm:ss} | {level} | {message}",
        level="INFO"
    )
    
    # Executa o script
    asyncio.run(main())