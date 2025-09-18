import cx_Oracle
import os

# Configurações do banco
dsn = cx_Oracle.makedsn('172.16.10.224', 1521, service_name='dbtest2')
connection = cx_Oracle.connect('juparana', 'a8b692f78c', dsn)
cursor = connection.cursor()

print('=== ANÁLISE DO CAMPO CLAS_PSV ===')
print()

# 1. Verificar quantos registros têm CLAS_PSV preenchido
cursor.execute('''
    SELECT 
        COUNT(*) as total_registros,
        COUNT(CLAS_PSV) as com_clas_psv,
        COUNT(*) - COUNT(CLAS_PSV) as sem_clas_psv
    FROM JUPARANA.PRODSERV
''')
result = cursor.fetchone()
print(f'Total de registros: {result[0]}')
print(f'Com CLAS_PSV preenchido: {result[1]}')
print(f'Sem CLAS_PSV (NULL): {result[2]}')
print()

# 2. Verificar valores únicos no campo CLAS_PSV
cursor.execute('''
    SELECT DISTINCT CLAS_PSV, COUNT(*) as quantidade
    FROM JUPARANA.PRODSERV 
    WHERE CLAS_PSV IS NOT NULL
    GROUP BY CLAS_PSV
    ORDER BY quantidade DESC
''')
results = cursor.fetchall()
print('=== VALORES ÚNICOS NO CAMPO CLAS_PSV ===')
if results:
    for row in results:
        print(f'Valor: "{row[0]}" - Quantidade: {row[1]}')
else:
    print('Nenhum valor encontrado (todos são NULL)')
print()

# 3. Verificar alguns exemplos de produtos com CLAS_PSV preenchido
cursor.execute('''
    SELECT CODI_PSV, DESC_PSV, CLAS_PSV
    FROM JUPARANA.PRODSERV 
    WHERE CLAS_PSV IS NOT NULL
    AND ROWNUM <= 10
''')
results = cursor.fetchall()
print('=== EXEMPLOS DE PRODUTOS COM CLAS_PSV PREENCHIDO ===')
if results:
    for row in results:
        print(f'Código: {row[0]} - Descrição: {row[1][:50]}... - CLAS_PSV: "{row[2]}"')
else:
    print('Nenhum produto encontrado com CLAS_PSV preenchido')

cursor.close()
connection.close()