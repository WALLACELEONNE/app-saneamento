'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { X, Save, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiMutations } from '@/lib/api';
import { DetalheMaterial, AtualizarMaterial, SaldoItem } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useUnidades, useTiposProduto, useTiposItem, useGrupos, useSubgrupos } from '@/hooks/use-dropdown-data';

interface EditProductModalProps {
  /** Item do produto a ser editado */
  product: SaldoItem | null;
  /** Estado de abertura do modal */
  open: boolean;
  /** Função para fechar o modal */
  onClose: () => void;
}

/**
 * Modal para edição das informações dos produtos
 * Permite alterar saldos do SIAGRI e CIGAM com observações
 */
export function EditProductModal({ product, open, onClose }: EditProductModalProps) {
  const queryClient = useQueryClient();
  
  // Estados do formulário - tipos validados conforme banco de dados
  const [formData, setFormData] = useState<{
    saldo_siagri: string;
    saldo_cigam: string;
    observacoes: string;
    // Campos validados conforme especificação do banco
    desc_psv: string; // P.DESC_PSV -- STRING
    unid_psv: string; // P.UNID_PSV -- STRING (obrigatório)
    situ_psv: 'A' | 'I'; // P.SITU_PSV -- STRING
    codi_cfp: string; // P.CODI_CFP -- STRING (opcional, mas mantido como string)
    codi_gpr: string; // P.CODI_GPR -- NUMBER
    codi_sbg: string; // P.CODI_SBG -- NUMBER
    codi_tip: string; // P.CODI_TIP -- NUMBER
    prse_psv: string; // P.PRSE_PSV -- STRING
  }>({
    saldo_siagri: '',
    saldo_cigam: '',
    observacoes: '',
    // Campos validados conforme especificação do banco
    desc_psv: '',
    unid_psv: '',
    situ_psv: 'A',
    codi_cfp: '',
    codi_gpr: '',
    codi_sbg: '',
    codi_tip: '',
    prse_psv: '',
  });

  // Estados para validação
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hooks para buscar dados dos dropdowns
  const { data: unidades, isLoading: loadingUnidades } = useUnidades();
  const { data: tiposProduto, isLoading: loadingTiposProduto } = useTiposProduto();
  const { data: tiposItem, isLoading: loadingTiposItem } = useTiposItem();
  const { data: grupos, isLoading: loadingGrupos } = useGrupos();
  const { data: subgrupos, isLoading: loadingSubgrupos } = useSubgrupos(formData.codi_gpr);

  // Função para validar NCM
  const validateNCM = (ncm: string) => {
    if (!ncm) return 'NCM é obrigatório';
    if (ncm.length !== 8) return 'NCM deve ter exatamente 8 caracteres';
    if (!/^\d+$/.test(ncm)) return 'NCM deve conter apenas números';
    return '';
  };

  // Função para atualizar campos do formulário
  const updateFormField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validar NCM em tempo real
    if (field === 'ncm_psv') {
      const error = validateNCM(value);
      setErrors(prev => ({ ...prev, ncm_psv: error }));
    } else {
      // Limpar erro do campo se houver
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Mutação para atualizar o material
  const updateMutation = useMutation({
    mutationFn: (data: AtualizarMaterial) => {
      if (!product?.material) {
        throw new Error('Material não encontrado');
      }
      return apiMutations.atualizarMaterial(product.material, data);
    },
    onSuccess: () => {
      toast.success('Produto atualizado com sucesso!');
      // Invalida as queries de saldos para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['saldos'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar produto');
    },
  });

  /**
   * Atualiza os dados do formulário quando o produto muda
   * Mantém os valores originais do produto para exibição nos selects
   */
  useEffect(() => {
    if (product) {
      setFormData({
        saldo_siagri: product.saldo_siagri?.toString() || '',
        saldo_cigam: product.saldo_cigam?.toString() || '',
        observacoes: '',
        // Campos validados conforme especificação do banco
        desc_psv: product.descricao || '',
        unid_psv: (product.unidade && typeof product.unidade === 'string') ? product.unidade.trim() : '',
        situ_psv: product.status || 'A',
        codi_cfp: product.ncm_cla_fiscal || '', // NCM/Classificação Fiscal (COALESCE de vários campos)
        // Convertendo os códigos para string para compatibilidade com o DropdownSelect
        // IMPORTANTE: Mantemos os valores originais para que sejam exibidos nos selects
        codi_gpr: product.codigo_grupo ? product.codigo_grupo.toString().trim() : '',
        codi_sbg: product.codigo_subgrupo ? product.codigo_subgrupo.toString().trim() : '',
        codi_tip: (product.tipo_item && typeof product.tipo_item === 'string') ? product.tipo_item.trim() : '',
        prse_psv: (product.tipo_material && typeof product.tipo_material === 'string') ? product.tipo_material.trim() : '',
      });
      
      // Limpar erros
      setErrors({});
    } else {
      setFormData({
        saldo_siagri: '',
        saldo_cigam: '',
        observacoes: '',
        desc_psv: '',
        unid_psv: '',
        situ_psv: 'A',
        codi_cfp: '',
        codi_gpr: '',
        codi_sbg: '',
        codi_tip: '',
        prse_psv: '',
      });
    }
  }, [product]);

  /**
   * Fecha o modal e reseta o formulário
   */
  const handleClose = () => {
    setFormData({
      saldo_siagri: '',
      saldo_cigam: '',
      observacoes: '',
      // Campos validados conforme especificação do banco
      desc_psv: '',
      unid_psv: '',
      situ_psv: 'A',
      codi_cfp: '',
      codi_gpr: '',
      codi_sbg: '',
      codi_tip: '',
      prse_psv: '',
    });
    setErrors({});
    onClose();
  };

  /**
   * Submete o formulário de edição
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    // Validações básicas
    const novoSaldoSiagri = parseFloat(formData.saldo_siagri);
    const novoSaldoCigam = parseFloat(formData.saldo_cigam);

    if (isNaN(novoSaldoSiagri) || novoSaldoSiagri < 0) {
      toast.error('Saldo SIAGRI deve ser um número válido e não negativo');
      return;
    }

    if (isNaN(novoSaldoCigam) || novoSaldoCigam < 0) {
      toast.error('Saldo CIGAM deve ser um número válido e não negativo');
      return;
    }

    // Validação da descrição
    if (!formData.desc_psv.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    // Validação da unidade
    if (!formData.unid_psv.trim()) {
      toast.error('Unidade é obrigatória');
      return;
    }

    // Validação do NCM (deve ter 8 caracteres se preenchido)
    if (formData.codi_cfp.trim() && formData.codi_cfp.trim().length !== 8) {
      toast.error('NCM deve ter exatamente 8 caracteres');
      return;
    }

    // Prepara os dados para envio - tipos validados conforme banco de dados
    const updateData: AtualizarMaterial = {
      material_id: product.material, // P.CODI_PSV -- STRING
      empresa_id: product.empresa?.toString() || '', // Validação para evitar erro quando empresa for null
      novo_saldo_siagri: novoSaldoSiagri,
      novo_saldo_cigam: novoSaldoCigam,
      observacoes: formData.observacoes.trim() || undefined,
      // Campos validados conforme especificação do banco
      desc_psv: formData.desc_psv.trim(), // P.DESC_PSV -- STRING
      unid_psv: formData.unid_psv.trim(), // P.UNID_PSV -- STRING (obrigatório)
      situ_psv: formData.situ_psv as 'A' | 'I', // P.SITU_PSV -- STRING
      clas_psv: undefined, // P.CLAS_PSV -- STRING: Classificação do tipo de produto (P=Produto, F=Fertilizante, M=Material, E=Equipamento) - Campo não editável pelo usuário
      codi_cfp: formData.codi_cfp.trim() || undefined, // PD.CFIS_PRO -- STRING: NCM - Classificação Fiscal (opcional) - Tabela JUPARANA.PRODUTO
      codi_gpr: formData.codi_gpr ? parseInt(formData.codi_gpr) : undefined, // P.CODI_GPR -- NUMBER
      codi_sbg: formData.codi_sbg ? parseInt(formData.codi_sbg) : undefined, // P.CODI_SBG -- NUMBER
      codi_tip: formData.codi_tip ? parseInt(formData.codi_tip) : undefined, // P.CODI_TIP -- NUMBER
      prse_psv: formData.prse_psv || undefined, // P.PRSE_PSV -- STRING
    };

    updateMutation.mutate(updateData);
  };

  /**
   * Calcula a nova diferença baseada nos valores do formulário
   */
  const calcularNovaDiferenca = () => {
    const siagri = parseFloat(formData.saldo_siagri) || 0;
    const cigam = parseFloat(formData.saldo_cigam) || 0;
    return siagri - cigam;
  };

  if (!product) return null;

  const novaDiferenca = calcularNovaDiferenca();
  const diferencaAtual = product.diferenca_saldo;
  const houveMudanca = 
    parseFloat(formData.saldo_siagri) !== product.saldo_siagri ||
    parseFloat(formData.saldo_cigam) !== product.saldo_cigam ||
    formData.desc_psv !== (product.descricao || '') ||
    formData.unid_psv !== (product.unidade || '') ||
    formData.situ_psv !== product.status ||
    formData.codi_cfp !== (product.ncm_cla_fiscal || '');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Altere os saldos do produto nos sistemas SIAGRI e CIGAM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do produto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primeira linha - Código e Tipo Item */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Código Material
                  </Label>
                  <p className="font-mono text-sm">{product.material}</p>
                </div>
                <DropdownSelect
                  label="Tipo Item"
                  value={formData.codi_tip}
                  onValueChange={(value) => updateFormField('codi_tip', value)}
                  options={tiposItem || []}
                  loading={loadingTiposItem}
                  placeholder="Selecione o tipo de item"
                  required
                />
              </div>

              {/* Segunda linha - Descrição (editável) */}
              <div>
                <Label htmlFor="descricao" className="text-sm font-medium">
                  Descrição *
                </Label>
                <Input
                  id="descricao"
                  value={formData.desc_psv}
                  onChange={(e) => setFormData(prev => ({ ...prev, desc_psv: e.target.value }))}
                  placeholder="Digite a descrição do produto"
                  className="mt-1"
                />
              </div>

              {/* Terceira linha - Tipo Produto e Grupo */}
              <div className="grid grid-cols-2 gap-4">
                <DropdownSelect
                  label="Tipo Produto"
                  value={formData.prse_psv}
                  onValueChange={(value) => updateFormField('prse_psv', value)}
                  options={tiposProduto || []}
                  loading={loadingTiposProduto}
                  placeholder="Selecione o tipo de produto"
                  required
                />
                <DropdownSelect
                  label="Grupo"
                  value={formData.codi_gpr}
                  onValueChange={(value) => updateFormField('codi_gpr', value)}
                  options={grupos || []}
                  loading={loadingGrupos}
                  placeholder="Selecione o grupo"
                  required
                />
              </div>

              {/* Quarta linha - Subgrupo e Unidade */}
              <div className="grid grid-cols-2 gap-4">
                <DropdownSelect
                  label="Subgrupo"
                  value={formData.codi_sbg}
                  onValueChange={(value) => updateFormField('codi_sbg', value)}
                  options={subgrupos || []}
                  loading={loadingSubgrupos}
                  placeholder="Selecione o subgrupo"
                  disabled={!formData.codi_gpr}
                  required
                />
                <DropdownSelect
                  label="Unidade"
                  value={formData.unid_psv}
                  onValueChange={(value) => updateFormField('unid_psv', value)}
                  options={unidades || []}
                  loading={loadingUnidades}
                  placeholder="Selecione a unidade"
                  required
                />
              </div>

              {/* Quinta linha - Status e NCM */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status *
                  </Label>
                  <Select
                    value={formData.situ_psv}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, situ_psv: value as 'A' | 'I' }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Ativo</SelectItem>
                      <SelectItem value="I">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ncm" className="text-sm font-medium">
                    NCM/Classificação Fiscal *
                  </Label>
                  <Input
                    id="ncm"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={formData.codi_cfp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '') // Remove não-dígitos
                      updateFormField('codi_cfp', value)
                    }}
                    placeholder="Digite o NCM (8 dígitos)"
                    className={`mt-1 ${
                      errors.codi_cfp ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  {errors.codi_cfp && (
                    <p className="text-red-500 text-sm mt-1">{errors.codi_cfp}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saldos atuais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saldos Atuais</CardTitle>
              <CardDescription>
                Valores atualmente registrados nos sistemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    SIAGRI
                  </Label>
                  <p className="text-lg font-mono">
                    {formatNumber(product.saldo_siagri)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    CIGAM
                  </Label>
                  <p className="text-lg font-mono">
                    {formatNumber(product.saldo_cigam)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Diferença
                  </Label>
                  <p className={`text-lg font-mono ${
                    diferencaAtual === 0 
                      ? 'text-muted-foreground' 
                      : diferencaAtual > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatNumber(diferencaAtual)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Novos saldos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novos Saldos</CardTitle>
              <CardDescription>
                Insira os novos valores para os sistemas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="saldo_siagri">Saldo SIAGRI</Label>
                  <Input
                    id="saldo_siagri"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.saldo_siagri}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      saldo_siagri: e.target.value
                    }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saldo_cigam">Saldo CIGAM</Label>
                  <Input
                    id="saldo_cigam"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.saldo_cigam}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      saldo_cigam: e.target.value
                    }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              
              {/* Nova diferença */}
              {houveMudanca && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Nova Diferença
                  </Label>
                  <p className={`text-lg font-mono ${
                    novaDiferenca === 0 
                      ? 'text-muted-foreground' 
                      : novaDiferenca > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatNumber(novaDiferenca)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                observacoes: e.target.value
              }))}
              placeholder="Descreva o motivo da alteração..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !houveMudanca}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}