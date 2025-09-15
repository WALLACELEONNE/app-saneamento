import cx_Oracle
import os
from dotenv import load_dotenv

load_dotenv()

# Configurações do Oracle
oracle_host = os.getenv('ORACLE_HOST')
oracle_port = os.getenv('ORACLE_PORT')
oracle_service = os.getenv('ORACLE_SERVICE')
oracle_user = os.getenv('ORACLE_USER')
oracle_password = os.getenv('ORACLE_PASSWORD')

# String de conexão
dsn = cx_Oracle.makedsn(oracle_host, oracle_port, service_name=oracle_service)
connection_string = f"{oracle_user}/{oracle_password}@{dsn}"

try:
    # Conectar ao banco
    connection = cx_Oracle.connect(connection_string)
    cursor = connection.cursor()
    
    print("Verificando schemas disponíveis...")
    
    # Verificar schemas disponíveis
    cursor.execute("""
        SELECT DISTINCT owner 
        FROM all_tables 
        WHERE owner IN ('JUPARANA', 'CIGAM11')
        ORDER BY owner
    """)
    
    schemas = cursor.fetchall()
    print(f"Schemas encontrados: {[s[0] for s in schemas]}")
    
    # Verificar tabelas do CIGAM11
    print("\nVerificando tabelas do CIGAM11...")
    cursor.execute("""
        SELECT table_name 
        FROM all_tables 
        WHERE owner = 'CIGAM11' 
        AND table_name IN ('ESESTOQU', 'ESMATERI')
        ORDER BY table_name
    """)
    
    cigam_tables = cursor.fetchall()
    print(f"Tabelas CIGAM11: {[t[0] for t in cigam_tables]}")
    
    # Verificar estrutura da tabela GRUPO
    print("\nEstrutura da tabela GRUPO:")
    cursor.execute("""
        SELECT column_name, data_type 
        FROM all_tab_columns 
        WHERE owner = 'JUPARANA' 
        AND table_name = 'GRUPO'
        ORDER BY column_id
    """)
    
    columns = cursor.fetchall()
    for col in columns[:10]:  # Mostrar apenas as primeiras 10 colunas
        print(f"  - {col[0]} ({col[1]})")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"Erro ao conectar: {e}")