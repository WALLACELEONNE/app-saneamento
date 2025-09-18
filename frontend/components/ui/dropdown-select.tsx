import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface DropdownOption {
  id: string
  codigo: string
  nome: string
  descricao: string
}

interface DropdownSelectProps {
  label: string
  value?: string
  onValueChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string
  className?: string
  required?: boolean
}

/**
 * Componente de dropdown reutilizável para seleção de opções
 */
export function DropdownSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Selecione uma opção",
  disabled = false,
  loading = false,
  error,
  className,
  required = false
}: DropdownSelectProps) {
  // Sentinela para representar valores vazios no Radix Select (Select.Item não pode ter value="")
  const EMPTY_SENTINEL = '__EMPTY__'

  // Normalizar opções para garantir consistência
  const normalizedOptions = React.useMemo(() => {
    if (!options || options.length === 0) return [];
    
    return options
      .filter((option) => {
        // Aceita todos os códigos, incluindo strings vazias (valores do banco)
        return option.codigo !== null && 
               option.codigo !== undefined && 
               typeof option.codigo === 'string';
      })
      // Remove duplicatas baseado no código normalizado
      .filter((option, index, array) => {
        const valorLimpo = option.codigo.trim();
        return array.findIndex(item => item.codigo.trim() === valorLimpo) === index;
      })
      .map(option => ({
        ...option,
        codigo: option.codigo.trim() // Normalizar código
      }));
  }, [options]);

  // Normalizar o valor recebido
  const normalizedValue = React.useMemo(() => {
    console.log(`[${label}] === NORMALIZANDO VALOR ===`);
    console.log(`[${label}] Valor recebido:`, value, typeof value);
    console.log(`[${label}] Opções disponíveis:`, normalizedOptions.length);
    console.log(`[${label}] Primeiras 3 opções:`, normalizedOptions.slice(0, 3));
    
    if (!value) {
      console.log(`[${label}] Valor vazio ou undefined - retornando string vazia`);
      return '';
    }
    
    const stringValue = String(value);
    console.log(`[${label}] Valor como string:`, `"${stringValue}"`);
    
    const foundOption = normalizedOptions.find(opt => opt.codigo === stringValue);
    console.log(`[${label}] Opção encontrada:`, foundOption);
    
    if (!foundOption) {
      console.log(`[${label}] ⚠️ OPÇÃO NÃO ENCONTRADA! Códigos disponíveis:`, normalizedOptions.map(opt => opt.codigo));
    }
    
    console.log(`[${label}] Valor normalizado final:`, `"${stringValue}"`);
    return stringValue;
  }, [value, normalizedOptions, label]);

  // Verificar se o valor atual existe nas opções e limpar se não existir
  React.useEffect(() => {
    if (!loading && normalizedOptions.length > 0 && normalizedValue) {
      const valueExists = normalizedOptions.some(opt => opt.codigo === normalizedValue);
      
      if (!valueExists) {
        console.log(`[DropdownSelect] Valor "${normalizedValue}" não encontrado nas opções para ${label}. Opções disponíveis:`, normalizedOptions.map(opt => opt.codigo));
        
        // Não limpar automaticamente o valor - deixar que o usuário ou o sistema pai gerencie
        // Isso evita a dessincronização com os selects HTML que já têm o valor correto
        console.log(`[DropdownSelect] Mantendo valor "${normalizedValue}" mesmo não estando nas opções carregadas`);
      }
    }
  }, [normalizedValue, normalizedOptions, label, loading]);

  // Valor para o Radix Select (mapeia string vazia para sentinela quando há opção vazia)
  const uiValue = React.useMemo(() => {
    console.log(`[DropdownSelect ${label}] Calculando uiValue:`, {
      normalizedValue,
      normalizedOptions: normalizedOptions.map(opt => opt.codigo),
      hasEmptyOption: normalizedOptions.some(opt => opt.codigo === '')
    });
    
    if (normalizedValue === '') {
      const hasEmptyOption = normalizedOptions.some(opt => opt.codigo === '');
      return hasEmptyOption ? EMPTY_SENTINEL : '';
    }
    
    // Verificar se o valor existe nas opções
    const valueExists = normalizedOptions.some(opt => opt.codigo === normalizedValue);
    if (!valueExists && normalizedValue) {
      console.warn(`[DropdownSelect ${label}] Valor "${normalizedValue}" não existe nas opções. Retornando valor mesmo assim para evitar dessincronização.`);
      // Retornar o valor mesmo que não exista nas opções para manter sincronização
      return normalizedValue;
    }
    
    return normalizedValue;
  }, [normalizedValue, normalizedOptions, label]);

  // Função para lidar com mudança de valor
  const handleValueChange = React.useCallback((newValue: string) => {
    // Mapear sentinela de volta para string vazia
    const mapped = newValue === EMPTY_SENTINEL ? '' : newValue;
    const normalizedNewValue = mapped.trim();
    onValueChange(normalizedNewValue);
  }, [onValueChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Select
        value={uiValue}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(
          "w-full",
          error && "border-red-500 focus:border-red-500"
        )}>
          <SelectValue 
            placeholder={loading ? "Carregando..." : placeholder}
          />
        </SelectTrigger>
        
        <SelectContent>
          {loading ? (
            <SelectItem value="loading" disabled>
              Carregando opções...
            </SelectItem>
          ) : normalizedOptions.length === 0 ? (
            <SelectItem value="empty" disabled>
              Nenhuma opção disponível
            </SelectItem>
          ) : (
            normalizedOptions.map((option, index) => {
              // Usar uma combinação de codigo e index para garantir chaves únicas
              const chaveUnica = `item-${option.codigo || 'empty'}-${index}`;
              const itemValue = option.codigo === '' ? EMPTY_SENTINEL : option.codigo;
              return (
                <SelectItem 
                  key={chaveUnica} 
                  value={itemValue}
                >
                  {option.descricao || option.nome || (option.codigo === '' ? '(Vazio)' : option.codigo)}
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}