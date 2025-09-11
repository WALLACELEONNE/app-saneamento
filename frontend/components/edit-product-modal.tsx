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
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    saldo_siagri: product?.saldo_siagri?.toString() || '',
    saldo_cigam: product?.saldo_cigam?.toString() || '',
    observacoes: '',
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

    // Prepara os dados para envio
    const updateData: AtualizarMaterial = {
      produto_id: product.material,
      empresa_id: product.empresa.toString(),
      novo_saldo_siagri: novoSaldoSiagri,
      novo_saldo_cigam: novoSaldoCigam,
      observacoes: formData.observacoes.trim() || undefined,
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
    parseFloat(formData.saldo_cigam) !== product.saldo_cigam;

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
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Código
                  </Label>
                  <p className="font-mono text-sm">{product.material}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Status
                  </Label>
                  <div>
                    <Badge variant={product.status === 'A' ? 'default' : 'secondary'}>
                      {product.status === 'A' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Descrição
                </Label>
                <p className="text-sm">{product.descricao}</p>
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