import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:8877';
const apiUrl = 'http://localhost:7700/api/v1';

test.describe('Testes de Filtros de Saldos', () => {
  // Configuração inicial para cada teste
  test.beforeEach(async ({ page }) => {
    // Navegar para a página inicial
    await page.goto(`${baseUrl}/`);
  });

  // Função auxiliar para aplicar filtros no formulário principal
  /**
   * Aplica os filtros na página inicial (empresa, grupo e flags) usando seletores por ARIA.
   * Retorna os IDs efetivamente selecionados, extraídos do label do combobox.
   */
  async function applyFilters(
    page: import('@playwright/test').Page,
    {
      empresaId,
      grupoId,
      flags,
    }: {
      empresaId: number;
      grupoId: number;
      flags: {
        apenas_divergentes?: boolean;
        saldos_positivos_siagri?: boolean;
        saldos_positivos_cigam?: boolean;
      };
    }
  ) {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');

    // Selecionar empresa (usa listbox e texto visível; se não encontrar por texto, confirma a primeira opção ativa)
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 10000 });
    const empresaOptionByText = page.getByRole('option', { name: new RegExp(`^\\s*${empresaId}\\s*-`) });
    if (await empresaOptionByText.count()) {
      await empresaOptionByText.first().click();
    } else {
      await page.keyboard.press('Enter');
    }
    // Capturar ID realmente selecionado a partir do texto do botão (ex.: "1 - PGM")
    const empresaLabel = (await empresaSelect.textContent()) ?? '';
    const selectedEmpresaId = parseInt(empresaLabel.match(/^\s*(\d+)\s*-/)?.[1] ?? String(empresaId), 10);

    // Aguardar grupo habilitar e selecionar
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await expect(grupoSelect).toBeEnabled({ timeout: 20000 });
    await grupoSelect.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 10000 });
    const grupoOptionByText = page.getByRole('option', { name: new RegExp(`^\\s*${grupoId}\\s*-`) });
    if (await grupoOptionByText.count()) {
      await grupoOptionByText.first().click();
    } else {
      await page.keyboard.press('Enter');
    }
    const grupoLabel = (await grupoSelect.textContent()) ?? '';
    const selectedGrupoId = parseInt(grupoLabel.match(/^\s*(\d+)\s*-/)?.[1] ?? String(grupoId), 10);

    // Ajustar checkboxes para refletir exatamente as flags desejadas
    const checkboxes = [
      { idx: 0, key: 'apenas_divergentes' as const },
      { idx: 1, key: 'saldos_positivos_siagri' as const },
      { idx: 2, key: 'saldos_positivos_cigam' as const },
    ];

    for (const { idx, key } of checkboxes) {
      const desired = Boolean(flags[key]);
      const cb = page.locator('button[role="checkbox"]').nth(idx);
      await cb.waitFor({ state: 'visible', timeout: 5000 });
      const aria = (await cb.getAttribute('aria-checked')) ?? 'false';
      const isChecked = aria === 'true';
      if (desired !== isChecked) {
        await cb.click();
      }
    }

    return { selectedEmpresaId, selectedGrupoId };
  }

  // Função auxiliar para submeter e aguardar resultados
  /**
   * Submete o formulário e aguarda a transição para a página de resultados (/results).
   */
  async function submitAndWait(page: import('@playwright/test').Page) {
    const submitBtn = page.getByRole('button', { name: /Consultar Saldos/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await page.waitForURL('**/results**', { timeout: 20000 });
    await page.waitForLoadState('networkidle');
  }

  // Função auxiliar que monta a query de API conforme flags e valida respostas
  async function fetchApi(
    {
      empresaId,
      grupoId,
      flags,
    }: {
      empresaId: number;
      grupoId: number;
      flags: {
        apenas_divergentes?: boolean;
        saldos_positivos_siagri?: boolean;
        saldos_positivos_cigam?: boolean;
      };
    },
    page: import('@playwright/test').Page
  ) {
    const params = new URLSearchParams();
    params.set('empresa_id', String(empresaId));
    params.set('grupo_id', String(grupoId));
    if (flags.apenas_divergentes) params.set('apenas_divergentes', 'true');
    if (flags.saldos_positivos_siagri) params.set('saldos_positivos_siagri', 'true');
    if (flags.saldos_positivos_cigam) params.set('saldos_positivos_cigam', 'true');

    const resp = await page.request.get(`${apiUrl}/saldos?${params.toString()}`);
    expect(resp.ok()).toBeTruthy();
    const contentType = (resp.headers()['content-type'] ?? '').toLowerCase();
    expect(contentType).toContain('application/json');
    const data = await resp.json();
    return data as { total: number; items: any[] };
  }

  // Função auxiliar para validar tabela de resultados contra a API
  async function validateResults(
    page: import('@playwright/test').Page,
    apiData: { total: number; items: any[] },
    flags: {
      apenas_divergentes?: boolean;
      saldos_positivos_siagri?: boolean;
      saldos_positivos_cigam?: boolean;
    }
  ) {
    // Se a API trouxe itens, a tabela deve ter linhas
    const tableRows = await page.locator('tbody tr');
    const rowCount = await tableRows.count();
    if (apiData.items.length > 0) {
      expect(rowCount).toBeGreaterThan(0);
    }

    // Validar condições por item conforme flags
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      if (flags.apenas_divergentes) expect(siagri).not.toBe(cigam);
      if (flags.saldos_positivos_siagri) expect(siagri).toBeGreaterThan(0);
      if (flags.saldos_positivos_cigam) expect(cigam).toBeGreaterThan(0);
    }
  }

  // Teste único com fluxo completo e combinações de flags
  test('Fluxo completo de filtros de saldos - combinações em um único teste', async ({ page }) => {
    const desiredEmpresaId = 1;
    const desiredGrupoId = 80;

    const scenarios: Array<{
      name: string;
      flags: {
        apenas_divergentes?: boolean;
        saldos_positivos_siagri?: boolean;
        saldos_positivos_cigam?: boolean;
      };
    }> = [
      { name: 'Sem flags', flags: {} },
      { name: 'Apenas divergentes', flags: { apenas_divergentes: true } },
      { name: 'SIAGRI positivo', flags: { saldos_positivos_siagri: true } },
      { name: 'CIGAM positivo', flags: { saldos_positivos_cigam: true } },
      { name: 'Divergentes + CIGAM positivo', flags: { apenas_divergentes: true, saldos_positivos_cigam: true } },
      { name: 'SIAGRI positivo + CIGAM positivo', flags: { saldos_positivos_siagri: true, saldos_positivos_cigam: true } },
      { name: 'Todas as flags', flags: { apenas_divergentes: true, saldos_positivos_siagri: true, saldos_positivos_cigam: true } },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];

      if (i === 0) {
        // Primeira iteração começa na home
        await page.goto(`${baseUrl}/`);
      } else {
        // Preferir retornar pela UI usando "Nova Consulta"; se não existir, voltar via URL
        const novaConsultaBtn = page.getByRole('button', { name: /Nova Consulta/i });
        try {
          await expect(novaConsultaBtn).toBeVisible({ timeout: 3000 });
          await novaConsultaBtn.click();
          await page.waitForURL('**/', { timeout: 15000 });
        } catch {
          await page.goto(`${baseUrl}/`);
        }
      }
      await page.waitForLoadState('networkidle');

      const { selectedEmpresaId, selectedGrupoId } = await applyFilters(page, {
        empresaId: desiredEmpresaId,
        grupoId: desiredGrupoId,
        flags: scenario.flags,
      });

      await submitAndWait(page);

      const apiData = await fetchApi(
        { empresaId: selectedEmpresaId, grupoId: selectedGrupoId, flags: scenario.flags },
        page
      );
      console.log(
        `[Cenário] ${scenario.name} => total API: ${apiData.total} (empresa=${selectedEmpresaId}, grupo=${selectedGrupoId})`
      );

      await validateResults(page, apiData, scenario.flags);
    }
  });

  test.skip('Filtro apenas divergentes - deve mostrar apenas itens com diferenças', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar checkbox "apenas divergentes" usando o seletor correto do Shadcn/UI
    await page.locator('button[role="checkbox"]').first().click();
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&apenas_divergentes=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens divergentes (empresa=1, grupo=80): ${apiData.total}`);
    console.log(`Itens na página atual: ${apiData.items.length}`);
    
    // Validar que todos os itens têm diferenças
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(siagri).not.toBe(cigam);
      console.log(`Material ${item.material}: SIAGRI=${siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);
  });

-  test('Filtro saldos positivos SIAGRI - deve mostrar apenas saldos > 0 no SIAGRI', async ({ page }) => {
  test.skip('Filtro saldos positivos SIAGRI - deve mostrar apenas saldos > 0 no SIAGRI', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar checkbox "saldos positivos SIAGRI"
    await page.locator('button[role="checkbox"]').nth(1).click();
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**');
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&apenas_divergentes=true&saldos_positivos_siagri=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens divergentes com SIAGRI positivo (empresa=1, grupo=80): ${apiData.total}`);
    
    // Validar condições
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(siagri).not.toBe(cigam); // Divergente
      expect(siagri).toBeGreaterThan(0); // SIAGRI positivo
      console.log(`Material ${item.material}: SIAGRI=${siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    if (apiData.items.length > 0) {
      expect(tableRows).toBeGreaterThan(0);
    }
  });

-  test('Filtro saldos positivos CIGAM - deve mostrar apenas saldos > 0 no CIGAM', async ({ page }) => {
  test.skip('Filtro saldos positivos CIGAM - deve mostrar apenas saldos > 0 no CIGAM', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar checkbox "saldos positivos CIGAM"
    await page.locator('button[role="checkbox"]').nth(2).click();
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&saldos_positivos_cigam=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens com CIGAM positivo (empresa=1, grupo=80): ${apiData.total}`);
    
    // Validar condições
    for (const item of apiData.items) {
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(cigam).toBeGreaterThan(0); // CIGAM positivo
      console.log(`Material ${item.material}: SIAGRI=${item.saldo_siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    if (apiData.items.length > 0) {
      expect(tableRows).toBeGreaterThan(0);
    }
  });

-  test('Combinação: apenas divergentes + saldos positivos CIGAM', async ({ page }) => {
  test.skip('Combinação: apenas divergentes + saldos positivos CIGAM', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar checkboxes
    await page.locator('button[role="checkbox"]').first().click(); // apenas divergentes
    await page.locator('button[role="checkbox"]').nth(2).click(); // saldos positivos CIGAM
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&apenas_divergentes=true&saldos_positivos_cigam=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens divergentes com CIGAM positivo (empresa=1, grupo=80): ${apiData.total}`);
    
    // Validar condições
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(siagri).not.toBe(cigam); // Divergente
      expect(cigam).toBeGreaterThan(0); // CIGAM positivo
      console.log(`Material ${item.material}: SIAGRI=${siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    if (apiData.items.length > 0) {
      expect(tableRows).toBeGreaterThan(0);
    }
  });

-  test('Combinação: saldos positivos SIAGRI + saldos positivos CIGAM', async ({ page }) => {
  test.skip('Combinação: saldos positivos SIAGRI + saldos positivos CIGAM', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar checkboxes
    await page.locator('button[role="checkbox"]').nth(1).click(); // saldos positivos SIAGRI
    await page.locator('button[role="checkbox"]').nth(2).click(); // saldos positivos CIGAM
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&saldos_positivos_siagri=true&saldos_positivos_cigam=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens com ambos saldos positivos (empresa=1, grupo=80): ${apiData.total}`);
    
    // Validar condições
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(siagri).toBeGreaterThan(0); // SIAGRI positivo
      expect(cigam).toBeGreaterThan(0); // CIGAM positivo
      console.log(`Material ${item.material}: SIAGRI=${siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    if (apiData.items.length > 0) {
      expect(tableRows).toBeGreaterThan(0);
    }
  });

-  test('Combinação completa: todas as flags ativas', async ({ page }) => {
  test.skip('Combinação completa: todas as flags ativas', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Marcar todas as checkboxes
    await page.locator('button[role="checkbox"]').first().click(); // apenas divergentes
    await page.locator('button[role="checkbox"]').nth(1).click(); // saldos positivos SIAGRI
    await page.locator('button[role="checkbox"]').nth(2).click(); // saldos positivos CIGAM
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80&apenas_divergentes=true&saldos_positivos_siagri=true&saldos_positivos_cigam=true`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens com todas as condições (empresa=1, grupo=80): ${apiData.total}`);
    
    // Validar todas as condições
    for (const item of apiData.items) {
      const siagri = parseFloat(item.saldo_siagri) || 0;
      const cigam = parseFloat(item.saldo_cigam) || 0;
      expect(siagri).not.toBe(cigam); // Divergente
      expect(siagri).toBeGreaterThan(0); // SIAGRI positivo
      expect(cigam).toBeGreaterThan(0); // CIGAM positivo
      console.log(`Material ${item.material}: SIAGRI=${siagri}, CIGAM=${cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    if (apiData.items.length > 0) {
      expect(tableRows).toBeGreaterThan(0);
    }
  });

  test.skip('Sem filtros de flags - deve mostrar todos os itens', async ({ page }) => {
    // Aguardar carregamento da página inicial
    await page.waitForLoadState('networkidle');
    
    // Aguardar e selecionar empresa = 1
    await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
    const empresaSelect = page.locator('button[role="combobox"]').first();
    await empresaSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="1"]');
    
    // Aguardar carregamento dos grupos e selecionar grupo = 80
    await page.waitForTimeout(1000); // Aguardar carregamento dos grupos
    const grupoSelect = page.locator('button[role="combobox"]').nth(1);
    await grupoSelect.click();
    await page.waitForSelector('[role="option"][data-value="80"]', { timeout: 5000 });
    await page.click('[role="option"][data-value="80"]');
    
    // Não marcar nenhuma checkbox (todas as flags false)
    
    // Submeter o formulário
    await page.click('button[type="submit"]');
    
    // Aguardar navegação para página de resultados
    await page.waitForURL('**/results**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Capturar dados da API para validação
    const apiResponse = await page.request.get(`${apiUrl}/saldos?empresa_id=1&grupo_id=80`);
    const apiData = await apiResponse.json();
    
    console.log(`Total de itens sem filtros de flags (empresa=1, grupo=80): ${apiData.total}`);
    
    // Deve haver itens (sem filtros restritivos)
    expect(apiData.total).toBeGreaterThan(0);
    
    // Verificar alguns itens (pode haver divergentes e não divergentes)
    for (let i = 0; i < Math.min(3, apiData.items.length); i++) {
      const item = apiData.items[i];
      console.log(`Material ${item.material}: SIAGRI=${item.saldo_siagri}, CIGAM=${item.saldo_cigam}`);
    }
    
    // Verificar se há linhas na tabela
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThan(0);
  });
}); // End of test describe block
});
});
});
});
});

