import { test, expect } from '@playwright/test';

/**
 * Testes E2E para funcionalidade de filtros
 * Testa carregamento da página inicial e interações com filtros
 */
test.describe('Filtros de Estoque', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial
    await page.goto('/');
    // Aguardar carregamento completo
    await page.waitForLoadState('networkidle');
  });

  test('deve carregar a página inicial com filtros', async ({ page }) => {
    // Verificar se o título está correto
    await expect(page).toHaveTitle(/Gestão de Saldos/);
    
    // Verificar se os elementos principais estão presentes
    await expect(page.locator('h1')).toContainText('Filtros de Estoque');
    
    // Verificar se os selects de filtro estão presentes
    await expect(page.locator('[data-testid="empresa-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="grupo-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="subgrupo-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="produto-select"]')).toBeVisible();
  });

  test('deve carregar empresas no select', async ({ page }) => {
    // Aguardar o select de empresa estar visível
    const empresaSelect = page.locator('[data-testid="empresa-select"]');
    await expect(empresaSelect).toBeVisible();
    
    // Clicar no select para abrir as opções
    await empresaSelect.click();
    
    // Aguardar as opções carregarem
    await page.waitForTimeout(1000);
    
    // Verificar se há opções disponíveis
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
    
    // Verificar se há pelo menos uma empresa
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);
  });

  test('deve habilitar grupo após selecionar empresa', async ({ page }) => {
    // Selecionar uma empresa
    const empresaSelect = page.locator('[data-testid="empresa-select"]');
    await empresaSelect.click();
    
    // Aguardar opções carregarem e selecionar a primeira
    await page.waitForTimeout(1000);
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Aguardar requisição para grupos
    await page.waitForTimeout(2000);
    
    // Verificar se o select de grupo está habilitado
    const grupoSelect = page.locator('[data-testid="grupo-select"]');
    await expect(grupoSelect).not.toBeDisabled();
  });

  test('deve carregar grupos após selecionar empresa', async ({ page }) => {
    // Selecionar uma empresa
    const empresaSelect = page.locator('[data-testid="empresa-select"]');
    await empresaSelect.click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    
    // Aguardar carregamento dos grupos
    await page.waitForTimeout(2000);
    
    // Clicar no select de grupo
    const grupoSelect = page.locator('[data-testid="grupo-select"]');
    await grupoSelect.click();
    
    // Verificar se há grupos disponíveis
    await page.waitForTimeout(1000);
    const grupoOptions = page.locator('[role="option"]');
    const grupoCount = await grupoOptions.count();
    expect(grupoCount).toBeGreaterThan(0);
  });

  test('deve carregar subgrupos após selecionar grupo', async ({ page }) => {
    // Selecionar empresa
    await page.locator('[data-testid="empresa-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Selecionar grupo
    await page.locator('[data-testid="grupo-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Verificar se subgrupo está habilitado
    const subgrupoSelect = page.locator('[data-testid="subgrupo-select"]');
    await expect(subgrupoSelect).not.toBeDisabled();
    
    // Clicar no select de subgrupo
    await subgrupoSelect.click();
    await page.waitForTimeout(1000);
    
    // Verificar se há subgrupos disponíveis
    const subgrupoOptions = page.locator('[role="option"]');
    const subgrupoCount = await subgrupoOptions.count();
    expect(subgrupoCount).toBeGreaterThan(0);
  });

  test('deve carregar produtos após selecionar subgrupo', async ({ page }) => {
    // Selecionar empresa
    await page.locator('[data-testid="empresa-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Selecionar grupo
    await page.locator('[data-testid="grupo-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Selecionar subgrupo
    await page.locator('[data-testid="subgrupo-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Verificar se produto está habilitado
    const produtoSelect = page.locator('[data-testid="produto-select"]');
    await expect(produtoSelect).not.toBeDisabled();
    
    // Clicar no select de produto
    await produtoSelect.click();
    await page.waitForTimeout(1000);
    
    // Verificar se há produtos disponíveis
    const produtoOptions = page.locator('[role="option"]');
    const produtoCount = await produtoOptions.count();
    expect(produtoCount).toBeGreaterThan(0);
  });

  test('deve manter estado dos filtros ao navegar', async ({ page }) => {
    // Selecionar filtros completos
    await page.locator('[data-testid="empresa-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    await page.locator('[data-testid="grupo-select"]').click();
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Recarregar a página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verificar se os filtros foram mantidos (através de URL params)
    const url = page.url();
    expect(url).toContain('empresa');
    expect(url).toContain('grupo');
  });

  test('deve exibir loading states durante carregamento', async ({ page }) => {
    // Interceptar requisições para simular delay
    await page.route('**/api/v1/filters/empresas', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Verificar se há indicador de loading
    const loadingIndicator = page.locator('[data-testid="loading"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Aguardar carregamento completar
    await page.waitForLoadState('networkidle');
    await expect(loadingIndicator).not.toBeVisible();
  });

  test('deve exibir mensagem de erro em caso de falha na API', async ({ page }) => {
    // Interceptar requisições para simular erro
    await page.route('**/api/v1/filters/empresas', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Erro interno do servidor' })
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se mensagem de erro é exibida
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Erro');
  });
});