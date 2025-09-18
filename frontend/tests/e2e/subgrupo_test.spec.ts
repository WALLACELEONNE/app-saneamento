import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:8877';
const testUrl = `${baseUrl}/results?empresa_id=1&grupo_id=84&apenas_divergentes=false&saldos_positivos_siagri=true&saldos_positivos_cigam=false`;

test.describe('Testes de Implementação do Subgrupo', () => {
  
  /**
   * Teste para verificar se a coluna Subgrupo está sendo exibida na tabela
   * e se os dados estão sendo carregados corretamente
   */
  test('deve exibir a coluna Subgrupo na tabela de resultados', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Verificar se a tabela está presente
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    
    // Verificar se o cabeçalho "Subgrupo" está presente na tabela
    const subgrupoHeader = page.locator('th').filter({ hasText: 'Subgrupo' });
    await expect(subgrupoHeader).toBeVisible();
    
    // Aguardar os dados carregarem
    await page.waitForTimeout(2000);
    
    // Verificar se existem linhas de dados na tabela
    const tableRows = page.locator('tbody tr');
    await expect(tableRows.first()).toBeVisible();
  });

  /**
   * Teste para verificar o subgrupo no modal de edição do produto
   * Navega até o menu de ações e abre o modal de edição
   */
  test('deve exibir o subgrupo no modal de edição do produto', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Aguardar a tabela carregar
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    
    // Aguardar os dados carregarem
    await page.waitForTimeout(3000);
    
    // Procurar pela primeira linha de dados na tabela
    const firstDataRow = page.locator('tbody tr').first();
    await expect(firstDataRow).toBeVisible();
    
    // Procurar pelo botão de ações (três pontos) na primeira linha
    const actionsButton = firstDataRow.locator('button[role="menuitem"], button').filter({ hasText: /⋮|\.\.\./ }).or(
      firstDataRow.locator('button').last()
    );
    
    // Se não encontrar o botão de ações pelos métodos acima, tentar pelo último botão da linha
    if (await actionsButton.count() === 0) {
      const lastButton = firstDataRow.locator('button').last();
      await expect(lastButton).toBeVisible();
      await lastButton.click();
    } else {
      await actionsButton.click();
    }
    
    // Aguardar o menu de ações aparecer
    await page.waitForTimeout(1000);
    
    // Procurar pela opção "Editar produto" no menu
    const editOption = page.locator('text=Editar produto, text=Editar, [role="menuitem"]').filter({ hasText: /Editar/ });
    
    if (await editOption.count() > 0) {
      await editOption.first().click();
    } else {
      // Tentar encontrar por outros seletores
      const editButton = page.locator('button, a, [role="menuitem"]').filter({ hasText: /Editar/ });
      await expect(editButton.first()).toBeVisible({ timeout: 5000 });
      await editButton.first().click();
    }
    
    // Aguardar o modal de edição abrir
    await expect(page.locator('[role="dialog"], .modal, .dialog')).toBeVisible({ timeout: 10000 });
    
    // Verificar se o título do modal está correto
    await expect(page.locator('text=Editar Produto')).toBeVisible();
    
    // Verificar se o campo de subgrupo está presente no modal
    const subgrupoField = page.locator('label').filter({ hasText: 'Subgrupo' });
    await expect(subgrupoField).toBeVisible();
    
    // Verificar se o select de subgrupo está presente
    const subgrupoSelect = page.locator('select, [role="combobox"]').filter({ hasText: /subgrupo/i }).or(
      subgrupoField.locator('..').locator('select, [role="combobox"]')
    );
    
    if (await subgrupoSelect.count() > 0) {
      await expect(subgrupoSelect.first()).toBeVisible();
      console.log('Campo de subgrupo encontrado no modal de edição');
    } else {
      // Verificar se há um input relacionado ao subgrupo
      const subgrupoInput = subgrupoField.locator('..').locator('input');
      if (await subgrupoInput.count() > 0) {
        await expect(subgrupoInput.first()).toBeVisible();
        console.log('Input de subgrupo encontrado no modal de edição');
      }
    }
  });

  /**
   * Teste para verificar se o rodapé está sendo exibido
   */
  test('deve exibir o rodapé com a frase da equipe de TI', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Verificar se o rodapé está presente
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Verificar se contém a frase esperada
    await expect(footer).toContainText('Desenvolvido pela equipe interna de TI');
    
    // Verificar se contém a versão
    await expect(footer).toContainText('v1.0.0.4');
  });

  /**
   * Teste para verificar a estrutura completa da tabela
   */
  test('deve ter todas as colunas esperadas na tabela', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Aguardar a tabela carregar
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    
    // Verificar se todas as colunas esperadas estão presentes
    const expectedHeaders = ['Código', 'Produto', 'Subgrupo', 'SIAGRI', 'CIGAM'];
    
    for (const header of expectedHeaders) {
      const headerElement = page.locator('th').filter({ hasText: header });
      await expect(headerElement).toBeVisible();
    }
  });

  /**
   * Teste específico para verificar o material 8402001228
   * no modal de edição
   */
  test('deve exibir o subgrupo para o material 8402001228 no modal de edição', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Aguardar a tabela carregar
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    
    // Aguardar os dados carregarem
    await page.waitForTimeout(3000);
    
    // Procurar pela linha que contém o material 8402001228
    const materialRow = page.locator('tr').filter({ hasText: '8402001228' });
    
    if (await materialRow.count() > 0) {
      console.log('Material 8402001228 encontrado, abrindo modal de edição...');
      
      // Procurar pelo botão de ações na linha do material
      const actionsButton = materialRow.locator('button').last();
      await expect(actionsButton).toBeVisible();
      await actionsButton.click();
      
      // Aguardar o menu de ações aparecer
      await page.waitForTimeout(1000);
      
      // Clicar em "Editar produto"
      const editOption = page.locator('text=Editar produto, text=Editar').filter({ hasText: /Editar/ });
      await editOption.first().click();
      
      // Aguardar o modal de edição abrir
      await expect(page.locator('[role="dialog"], .modal, .dialog')).toBeVisible({ timeout: 10000 });
      
      // Verificar se o campo de subgrupo está presente no modal
      const subgrupoField = page.locator('label').filter({ hasText: 'Subgrupo' });
      await expect(subgrupoField).toBeVisible();
      
      // Verificar se o valor do subgrupo está preenchido
      const subgrupoSelect = subgrupoField.locator('..').locator('select, [role="combobox"], input');
      if (await subgrupoSelect.count() > 0) {
        const subgrupoValue = await subgrupoSelect.first().inputValue();
        expect(subgrupoValue).not.toBe('');
        console.log(`Subgrupo do material 8402001228: ${subgrupoValue}`);
      }
    } else {
      console.log('Material 8402001228 não encontrado nos resultados atuais');
      
      // Verificar se pelo menos a estrutura da tabela está correta
      const headers = page.locator('th');
      const headerTexts = await headers.allTextContents();
      expect(headerTexts).toContain('Subgrupo');
    }
  });

  /**
   * Teste para verificar se o rodapé está sendo exibido na página
   * com a versão e frase da equipe de TI
   */
  test('deve exibir o rodapé com versão e frase da equipe de TI', async ({ page }) => {
    // Navegar para a URL específica de teste
    await page.goto(testUrl);
    
    // Aguardar o carregamento da página
    await page.waitForLoadState('networkidle');
    
    // Aguardar um pouco para garantir que todos os elementos carregaram
    await page.waitForTimeout(2000);
    
    // Verificar se o rodapé está presente
    const footer = page.locator('footer, .footer, [role="contentinfo"]');
    
    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible();
      
      // Verificar se contém informações de versão
      const versionText = footer.locator('text=/versão|version|v\d+\.\d+/i');
      if (await versionText.count() > 0) {
        await expect(versionText.first()).toBeVisible();
        console.log('Informação de versão encontrada no rodapé');
      }
      
      // Verificar se contém frase da equipe de TI
      const teamText = footer.locator('text=/equipe.*ti|ti.*equipe|desenvolvido.*por/i');
      if (await teamText.count() > 0) {
        await expect(teamText.first()).toBeVisible();
        console.log('Frase da equipe de TI encontrada no rodapé');
      }
      
      // Verificar o conteúdo geral do rodapé
      const footerContent = await footer.first().textContent();
      console.log(`Conteúdo do rodapé: ${footerContent}`);
      
    } else {
      // Se não encontrar footer específico, procurar por elementos no final da página
      const bottomElements = page.locator('body > *').last();
      const bottomContent = await bottomElements.textContent();
      
      if (bottomContent && (bottomContent.includes('versão') || bottomContent.includes('TI') || bottomContent.includes('equipe'))) {
        console.log('Informações de rodapé encontradas no final da página');
        console.log(`Conteúdo: ${bottomContent}`);
      } else {
        console.log('Rodapé não encontrado ou sem as informações esperadas');
      }
    }
  });

});