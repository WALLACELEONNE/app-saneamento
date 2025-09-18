#!/usr/bin/env python3
"""
Script para verificar triggers no banco Oracle
"""
import sys
import os
sys.path.append('/app')

from app.database import get_db
from sqlalchemy import text

def check_triggers():
    """Verifica triggers no banco Oracle"""
    db = next(get_db())
    
    try:
        # Verificar se a trigger ISTRG_MATERIAIS_EPI existe
        query = """
        SELECT trigger_name, status, trigger_type, triggering_event, table_name
        FROM user_triggers 
        WHERE trigger_name = 'ISTRG_MATERIAIS_EPI'
        """
        result = db.execute(text(query))
        triggers = result.fetchall()
        
        if triggers:
            print('Trigger ISTRG_MATERIAIS_EPI encontrada:')
            for trigger in triggers:
                print(f'Nome: {trigger[0]}, Status: {trigger[1]}, Tipo: {trigger[2]}, Evento: {trigger[3]}, Tabela: {trigger[4]}')
        else:
            print('Trigger ISTRG_MATERIAIS_EPI não encontrada')
        
        # Verificar todas as triggers na tabela PRODSERV
        query2 = """
        SELECT trigger_name, status, trigger_type, triggering_event
        FROM user_triggers 
        WHERE table_name = 'PRODSERV'
        ORDER BY trigger_name
        """
        result2 = db.execute(text(query2))
        triggers2 = result2.fetchall()
        
        print('\nTriggers na tabela PRODSERV:')
        if triggers2:
            for trigger in triggers2:
                print(f'Nome: {trigger[0]}, Status: {trigger[1]}, Tipo: {trigger[2]}, Evento: {trigger[3]}')
        else:
            print('Nenhuma trigger encontrada na tabela PRODSERV')
            
        # Verificar triggers inválidas
        query3 = """
        SELECT trigger_name, status, trigger_type, triggering_event, table_name
        FROM user_triggers 
        WHERE status = 'INVALID'
        ORDER BY trigger_name
        """
        result3 = db.execute(text(query3))
        invalid_triggers = result3.fetchall()
        
        print('\nTriggers inválidas:')
        if invalid_triggers:
            for trigger in invalid_triggers:
                print(f'Nome: {trigger[0]}, Status: {trigger[1]}, Tipo: {trigger[2]}, Evento: {trigger[3]}, Tabela: {trigger[4]}')
        else:
            print('Nenhuma trigger inválida encontrada')
            
    except Exception as e:
        print(f'Erro ao verificar triggers: {e}')
    finally:
        db.close()

if __name__ == "__main__":
    check_triggers()