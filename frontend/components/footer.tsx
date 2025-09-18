/**
 * Componente de rodapé do sistema
 * Exibe informações sobre desenvolvimento e versão atual
 */
export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Desenvolvido pela equipe interna de TI</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>v1.0.0.4</span>
        </div>
      </div>
    </footer>
  );
}