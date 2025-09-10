import Link from 'next/link';
import { Package, ArrowLeft, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Página exibida quando um material não é encontrado
 * Fornece opções de navegação e busca alternativa
 */
export default function MaterialNotFound() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center space-y-8">
        {/* Ícone e título */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Material não encontrado
            </h1>
            <p className="text-muted-foreground text-lg">
              O material que você está procurando não existe ou foi removido do sistema.
            </p>
          </div>
        </div>

        {/* Card com informações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              O que você pode fazer?
            </CardTitle>
            <CardDescription>
              Algumas sugestões para encontrar o que você precisa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Verifique o código do material</p>
                  <p className="text-sm text-muted-foreground">
                    Certifique-se de que o código ou ID do material está correto
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Use os filtros de busca</p>
                  <p className="text-sm text-muted-foreground">
                    Volte à página inicial e use os filtros para encontrar o material
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Consulte a lista completa</p>
                  <p className="text-sm text-muted-foreground">
                    Acesse os resultados para ver todos os materiais disponíveis
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Fazer nova busca
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/results" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Ver todos os resultados
            </Link>
          </Button>
        </div>

        {/* Informação adicional */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Se você acredita que este é um erro, entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
}