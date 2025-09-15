'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { apiMutations } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { SaldoItem, AtualizarMaterial } from '@/types';

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
    codi_gpr?: number; // P.CODI_GPR -- NUMBER
    codi_sbg?: number; // P.CODI_SBG -- NUMBER
    codi_tip?: number; // P.CODI_TIP -- NUMBER
    prse_psv?: string; // P.PRSE_PSV -- STRING
  }>({
    saldo_siagri: '',
    saldo_cigam: '',
    observacoes: '',
    // Campos validados conforme especificação do banco
    desc_psv: '',
    unid_psv: '',
    situ_psv: 'A',
    codi_cfp: '',
    codi_gpr: undefined,
    codi_sbg: undefined,
    codi_tip: undefined,
    prse_psv: undefined,
  });

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
   */
  useEffect(() => {
    if (product) {
      setFormData({
        saldo_siagri: product.saldo_siagri?.toString() || '',
        saldo_cigam: product.saldo_cigam?.toString() || '',
        observacoes: '',
        // Campos validados conforme especificação do banco
        desc_psv: product.descricao || '',
        unid_psv: product.unidade || '',
        situ_psv: (product.status as 'A' | 'I') || 'A',
        codi_cfp: product.ncm_cla_fiscal || '',
        codi_gpr: product.codigo_grupo || undefined,
        codi_sbg: product.codigo_subgrupo || undefined,
        codi_tip: undefined, // Não disponível no SaldoItem atual
        prse_psv: product.tipo_produto || undefined,
      });
    } else {
      setFormData({
        saldo_siagri: '',
        saldo_cigam: '',
        observacoes: '',
        desc_psv: '',
        unid_psv: '',
        situ_psv: 'A',
        codi_cfp: '',
        codi_gpr: undefined,
        codi_sbg: undefined,
        codi_tip: undefined,
        prse_psv: undefined,
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
      codi_gpr: undefined,
      codi_sbg: undefined,
      codi_tip: undefined,
      prse_psv: undefined,
    });
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
      produto_id: product.material, // P.CODI_PSV -- STRING
      empresa_id: product.empresa.toString(), // Convertido para string
      novo_saldo_siagri: novoSaldoSiagri,
      novo_saldo_cigam: novoSaldoCigam,
      observacoes: formData.observacoes.trim() || undefined,
      // Campos validados conforme especificação do banco
      desc_psv: formData.desc_psv.trim(), // P.DESC_PSV -- STRING
      unid_psv: formData.unid_psv.trim(), // P.UNID_PSV -- STRING (obrigatório)
      situ_psv: formData.situ_psv as 'A' | 'I', // P.SITU_PSV -- STRING
      codi_cfp: formData.codi_cfp.trim() || undefined, // P.CODI_CFP -- STRING (opcional)
      codi_gpr: formData.codi_gpr, // P.CODI_GPR -- NUMBER
      codi_sbg: formData.codi_sbg, // P.CODI_SBG -- NUMBER
      codi_tip: formData.codi_tip, // P.CODI_TIP -- NUMBER
      prse_psv: formData.prse_psv, // P.PRSE_PSV -- STRING
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
    <Dialog open={open} onOpenChange={handleClose}>
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Tipo Item
                  </Label>
                  <p className="text-sm">{product.tipo_item || 'N/A'}</p>
                </div>
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Tipo Produto
                  </Label>
                  <p className="text-sm">{product.tipo_produto || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Grupo
                  </Label>
                  <p className="text-sm">{product.codigo_grupo || 'N/A'}</p>
                </div>
              </div>

              {/* Quarta linha - Subgrupo e Unidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Subgrupo
                  </Label>
                  <p className="text-sm">{product.codigo_subgrupo || 'N/A'}</p>
                </div>
                <div>
                  <Label htmlFor="unidade" className="text-sm font-medium">
                    Unidade *
                  </Label>
                  <Input
                    id="unidade"
                    value={formData.unid_psv}
                    onChange={(e) => setFormData(prev => ({ ...prev, unid_psv: e.target.value }))}
                    placeholder="Ex: UN, KG, L"
                    className="mt-1"
                  />
                </div>
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
                    value={formData.codi_cfp}
                    onChange={(e) => setFormData(prev => ({ ...prev, codi_cfp: e.target.value }))}
                    placeholder="Digite o NCM (8 dígitos)"
                    className={`mt-1 ${
                      formData.codi_cfp && formData.codi_cfp.length !== 8
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {formData.codi_cfp && formData.codi_cfp.length !== 8 && (
                    <p className="text-xs text-red-500 mt-1">
                      NCM deve ter exatamente 8 caracteres
                    </p>
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