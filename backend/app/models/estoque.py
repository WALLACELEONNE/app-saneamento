from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional

from ..core.database import Base


class Empresa(Base):
    """
    Modelo para tabela de empresas (CADEMP)
    """
    __tablename__ = "empresas"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    codi_emp = Column(Integer, unique=True, nullable=False, comment="Código da empresa")
    iden_emp = Column(String(120), nullable=False, comment="Nome da empresa")
    situ_emp = Column(String(1), nullable=False, default="A", comment="Situação da empresa (A/I)")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    grupos = relationship("Grupo", back_populates="empresa")
    produtos = relationship("Produto", back_populates="empresa")
    saldos_siagri = relationship("SaldoSiagri", back_populates="empresa")
    
    def __repr__(self):
        return f"<Empresa(codi_emp={self.codi_emp}, iden_emp='{self.iden_emp}')>"


class Grupo(Base):
    """
    Modelo para tabela de grupos de produtos
    """
    __tablename__ = "grupos"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("juparana.empresas.id"), nullable=False)
    codi_gpr = Column(Integer, nullable=False, comment="Código do grupo")
    desc_gpr = Column(String(120), nullable=False, comment="Descrição do grupo")
    situ_gpr = Column(String(1), nullable=False, default="A", comment="Situação do grupo (A/I)")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="grupos")
    subgrupos = relationship("Subgrupo", back_populates="grupo")
    produtos = relationship("Produto", back_populates="grupo")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_grupos_empresa_codigo", "empresa_id", "codi_gpr"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<Grupo(codi_gpr={self.codi_gpr}, desc_gpr='{self.desc_gpr}')>"


class Subgrupo(Base):
    """
    Modelo para tabela de subgrupos de produtos
    """
    __tablename__ = "subgrupos"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("juparana.grupos.id"), nullable=False)
    codi_sbg = Column(Integer, nullable=False, comment="Código do subgrupo")
    desc_sbg = Column(String(120), nullable=False, comment="Descrição do subgrupo")
    situ_sbg = Column(String(1), nullable=False, default="A", comment="Situação do subgrupo (A/I)")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    grupo = relationship("Grupo", back_populates="subgrupos")
    produtos = relationship("Produto", back_populates="subgrupo")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_subgrupos_grupo_codigo", "grupo_id", "codi_sbg"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<Subgrupo(codi_sbg={self.codi_sbg}, desc_sbg='{self.desc_sbg}')>"


class Produto(Base):
    """
    Modelo para tabela de produtos/materiais
    """
    __tablename__ = "produtos"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("juparana.empresas.id"), nullable=False)
    grupo_id = Column(Integer, ForeignKey("juparana.grupos.id"), nullable=True)
    subgrupo_id = Column(Integer, ForeignKey("juparana.subgrupos.id"), nullable=True)
    codi_psv = Column(String(15), nullable=False, comment="Código do produto")
    desc_psv = Column(String(120), nullable=False, comment="Descrição do produto")
    situ_psv = Column(String(1), nullable=False, default="A", comment="Situação do produto (A/I)")
    unid_psv = Column(String(3), nullable=True, comment="Unidade de medida")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="produtos")
    grupo = relationship("Grupo", back_populates="produtos")
    subgrupo = relationship("Subgrupo", back_populates="produtos")
    saldos_siagri = relationship("SaldoSiagri", back_populates="produto")
    saldos_cigam = relationship("SaldoCigam", back_populates="produto")
    historico_movimentacoes = relationship("HistoricoMovimentacao", back_populates="produto")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_produtos_empresa_codigo", "empresa_id", "codi_psv"),
        Index("idx_produtos_grupo", "grupo_id"),
        Index("idx_produtos_subgrupo", "subgrupo_id"),
        Index("idx_produtos_situacao", "situ_psv"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<Produto(codi_psv='{self.codi_psv}', desc_psv='{self.desc_psv}')>"


class SaldoSiagri(Base):
    """
    Modelo para tabela de saldos do sistema SIAGRI
    """
    __tablename__ = "saldos_siagri"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("juparana.empresas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("juparana.produtos.id"), nullable=False)
    saldo = Column(Numeric(15, 3), nullable=False, default=0, comment="Saldo atual no SIAGRI")
    data_atualizacao = Column(DateTime, default=func.now(), nullable=False, comment="Data da última atualização")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    empresa = relationship("Empresa", back_populates="saldos_siagri")
    produto = relationship("Produto", back_populates="saldos_siagri")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_saldos_siagri_empresa_produto", "empresa_id", "produto_id"),
        Index("idx_saldos_siagri_data_atualizacao", "data_atualizacao"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<SaldoSiagri(empresa_id={self.empresa_id}, produto_id={self.produto_id}, saldo={self.saldo})>"


class SaldoCigam(Base):
    """
    Modelo para tabela de saldos do sistema CIGAM
    """
    __tablename__ = "saldos_cigam"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("juparana.produtos.id"), nullable=False)
    cd_material = Column(String(15), nullable=False, comment="Código do material no CIGAM")
    cd_unidade_de_n = Column(String(3), nullable=False, comment="Código da unidade de negócio")
    quantidade = Column(Numeric(15, 3), nullable=False, default=0, comment="Quantidade em estoque")
    data_atualizacao = Column(DateTime, default=func.now(), nullable=False, comment="Data da última atualização")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relacionamentos
    produto = relationship("Produto", back_populates="saldos_cigam")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_saldos_cigam_material", "cd_material"),
        Index("idx_saldos_cigam_unidade", "cd_unidade_de_n"),
        Index("idx_saldos_cigam_data_atualizacao", "data_atualizacao"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<SaldoCigam(cd_material='{self.cd_material}', quantidade={self.quantidade})>"


class HistoricoMovimentacao(Base):
    """
    Modelo para tabela de histórico de movimentações
    """
    __tablename__ = "historico_movimentacoes"
    __table_args__ = {"schema": "juparana"}
    
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("juparana.produtos.id"), nullable=False)
    tipo_movimentacao = Column(String(1), nullable=False, comment="Tipo de movimentação (E/S)")
    quantidade = Column(Numeric(15, 3), nullable=False, comment="Quantidade movimentada")
    saldo_anterior = Column(Numeric(15, 3), nullable=False, comment="Saldo antes da movimentação")
    saldo_atual = Column(Numeric(15, 3), nullable=False, comment="Saldo após a movimentação")
    sistema_origem = Column(String(10), nullable=False, comment="Sistema de origem (SIAGRI/CIGAM)")
    observacoes = Column(Text, nullable=True, comment="Observações da movimentação")
    data_movimentacao = Column(DateTime, default=func.now(), nullable=False, comment="Data da movimentação")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relacionamentos
    produto = relationship("Produto", back_populates="historico_movimentacoes")
    
    # Índices compostos
    __table_args__ = (
        Index("idx_historico_produto_data", "produto_id", "data_movimentacao"),
        Index("idx_historico_sistema_origem", "sistema_origem"),
        Index("idx_historico_tipo_movimentacao", "tipo_movimentacao"),
        {"schema": "juparana"}
    )
    
    def __repr__(self):
        return f"<HistoricoMovimentacao(produto_id={self.produto_id}, tipo='{self.tipo_movimentacao}', quantidade={self.quantidade})>"