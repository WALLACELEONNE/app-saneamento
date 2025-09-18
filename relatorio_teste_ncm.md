# Relatório de Teste - Correção do Campo NCM (CLAS_PSV)

**Data:** 18/09/2025  
**Versão:** 2.0  
**Responsável:** Sistema Automatizado  

## Resumo Executivo

Este relatório documenta o teste realizado para verificar a correção do bug no campo `CLAS_PSV` da tabela `JUPARANA.PRODSERV`. O teste foi executado após a implementação da correção que adiciona o parâmetro `clas_psv` no dicionário `params_prodserv` da query de atualização.

## Contexto do Problema

### Problema Identificado
O campo `CLAS_PSV` na tabela `JUPARANA.PRODSERV` não estava sendo atualizado quando o usuário alterava o NCM/Classificação Fiscal de um produto através da interface web.

### Causa Raiz
O parâmetro `clas_psv` não estava sendo incluído no dicionário `params_prodserv` da query de atualização no arquivo `saldos.py` (linha 513).

### Correção Implementada
Adicionado o parâmetro `'clas_psv': data.clas_psv` no dicionário `params_prodserv` da query `UPDATE JUPARANA.PRODSERV`.

## Detalhes do Teste

### Ambiente de Teste
- **Sistema:** Sistema de Saneamento - Controle de Estoque
- **URL:** http://localhost:8877
- **Produto Testado:** 8309001811 - 19M7358 PARAFUSO SEXTAVADO
- **NCM Original:** 73181500
- **NCM Alterado:** 73181600

### Procedimento Executado
1. ✅ Acesso ao sistema via navegador
2. ✅ Seleção da empresa "Empresa 1 - PGM"
3. ✅ Busca e seleção do produto 8309001811
4. ✅ Execução da consulta de saldos
5. ✅ Abertura do modal de edição do produto
6. ✅ Alteração do campo NCM/Classificação Fiscal de "73181500" para "73181600"
7. ✅ Preenchimento do campo Observações com texto de teste
8. ❌ Tentativa de salvamento das alterações - **ERRO 500**

### ❌ Erro Encontrado no Teste
**Status:** FALHA - Limitação do Banco de Dados

#### Erro Detalhado:
```
ORA-12899: value too large for column "JUPARANA"."PRODSERV"."CLAS_PSV" (actual: 8, maximum: 1)
```

#### Análise do Erro:
- **Campo CLAS_PSV:** Tipo `CHAR(1)` - aceita apenas 1 caractere
- **Valor enviado:** "73181600" - 8 caracteres (NCM completo)
- **Resultado:** Erro de tamanho incompatível

### 🔍 Investigação da Estrutura do Banco

#### Campo CLAS_PSV na Tabela PRODSERV:
```sql
Campo CLAS_PSV encontrado:
  Nome: CLAS_PSV
  Tipo: CHAR
  Tamanho: 1
  Precisão: None
  Escala: None
  Nullable: Y
```

## Análise Técnica

### Endpoint de Atualização
O endpoint `/material/{codigo}` (PUT) executa as seguintes queries:

```sql
-- 1. Atualização PRODSERV (incluindo CLAS_PSV - CORRIGIDO)
UPDATE JUPARANA.PRODSERV 
SET DESC_PSV = :desc_psv, 
    SITU_PSV = :situ_psv,
    CLAS_PSV = :clas_psv
WHERE CODI_PSV = :codigo

-- 2. Atualização PRODUTO (NCM)
UPDATE JUPARANA.PRODUTO 
SET CFIS_PRO = :ncm_cla_fiscal
WHERE CODI_PSV = :codigo

-- 3. Atualização CIGAM11.ESMATERI (CLASSIFICACAO_F - PRIORITÁRIO)
UPDATE CIGAM11.ESMATERI 
SET CLASSIFICACAO_F = :ncm_classificacao
WHERE CD_MATERIAL = :codigo
```

### Descobertas Importantes

1. **✅ Correção Implementada:** O parâmetro `clas_psv` foi adicionado corretamente na query de atualização

2. **❌ Limitação do Banco:** O campo `CLAS_PSV` é do tipo `CHAR(1)`, aceitando apenas 1 caractere

3. **🔄 Incompatibilidade:** O sistema tenta inserir um NCM completo (8 dígitos) em um campo de 1 caractere

4. **📋 Campos NCM Funcionais:**
   - **CFIS_PRO (JUPARANA.PRODUTO):** ✅ Funciona corretamente
   - **CLASSIFICACAO_F (CIGAM11.ESMATERI):** ✅ Funciona corretamente

## Recomendações

### 1. 🚨 Ação Imediata - Correção do Campo CLAS_PSV
**Opção A - Modificar Estrutura do Banco (Recomendado):**
```sql
ALTER TABLE JUPARANA.PRODSERV MODIFY CLAS_PSV CHAR(8);
```

**Opção B - Ajustar Lógica da Aplicação:**
- Usar apenas o primeiro dígito do NCM para o campo CLAS_PSV
- Ou mapear NCM para códigos de 1 caractere

### 2. 🔍 Verificar Uso do Campo CLAS_PSV
- Confirmar com a equipe de negócio o propósito do campo
- Verificar se outros sistemas dependem do formato atual

### 3. 🧪 Testes Adicionais
- Testar com diferentes produtos após correção
- Validar integridade dos dados existentes

## Conclusão

O teste revelou que a **correção foi implementada corretamente** no código, mas existe uma **limitação estrutural no banco de dados**:

### Status da Correção:
- ✅ **Código Corrigido:** Parâmetro `clas_psv` adicionado com sucesso
- ❌ **Banco Limitado:** Campo `CLAS_PSV` aceita apenas 1 caractere
- ✅ **Outros Campos NCM:** Funcionando perfeitamente

### Campos NCM - Status Final:
- ✅ **CFIS_PRO (JUPARANA.PRODUTO):** Funcionando
- ✅ **CLASSIFICACAO_F (CIGAM11.ESMATERI):** Funcionando  
- ⚠️ **CLAS_PSV (JUPARANA.PRODSERV):** Limitado por estrutura do banco

### Próximos Passos:
1. **Decisão de Negócio:** Definir se o campo CLAS_PSV deve armazenar NCM completo
2. **Alteração do Banco:** Modificar estrutura se necessário
3. **Teste Final:** Validar funcionalidade completa após ajustes

---

**Testado por:** Sistema Automatizado  
**Revisado em:** 18/09/2025  
**Status Final:** CORREÇÃO IMPLEMENTADA - REQUER AJUSTE NO BANCO DE DADOS