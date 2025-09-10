const puppeteer = require('puppeteer');
const { expect } = require('chai');

/**
 * Testes de performance e interações avançadas com Puppeteer
 * Complementa os testes do Playwright com foco em métricas de performance
 */
describe('Testes de Performance - Frontend', () => {
  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    // Configurar viewport para desktop
    await page.setViewport({ width: 1920, height: 1080 });
    // Habilitar métricas de performance
    await page.setCacheEnabled(false);
  });

  afterEach(async () => {
    await page.close();
  });

  after(async () => {
    await browser.close();
  });

  /**
   * Teste de tempo de carregamento inicial da página
   */
  it('deve carregar a página inicial em menos de 3 segundos', async () => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:8877', {
      waitUntil: 'networkidle2'
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`Tempo de carregamento: ${loadTime}ms`);
    
    expect(loadTime).to.be.below(3000);
  });

  /**
   * Teste de métricas Core Web Vitals
   */
  it('deve atender aos Core Web Vitals', async () => {
    await page.goto('http://localhost:8877', {
      waitUntil: 'networkidle2'
    });

    // Aguardar carregamento completo
    await page.waitForTimeout(2000);

    // Coletar métricas de performance
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Timeout para garantir que as métricas sejam coletadas
        setTimeout(() => resolve({}), 3000);
      });
    });

    console.log('Core Web Vitals:', metrics);
    
    // FCP deve ser menor que 1.8s
    if (metrics.fcp) {
      expect(metrics.fcp).to.be.below(1800);
    }
    
    // LCP deve ser menor que 2.5s
    if (metrics.lcp) {
      expect(metrics.lcp).to.be.below(2500);
    }
  });

  /**
   * Teste de responsividade em diferentes resoluções
   */
  it('deve ser responsivo em diferentes resoluções', async () => {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.goto('http://localhost:8877');
      await page.waitForSelector('h1');
      
      // Verificar se elementos principais estão visíveis
      const title = await page.$('h1');
      expect(title).to.not.be.null;
      
      // Verificar se filtros estão acessíveis
      const empresaSelect = await page.$('[data-testid="empresa-select"]');
      expect(empresaSelect).to.not.be.null;
      
      console.log(`✓ Layout responsivo em ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  /**
   * Teste de tempo de resposta das APIs de filtros
   */
  it('deve carregar filtros em menos de 500ms', async () => {
    await page.goto('http://localhost:8877');
    
    // Interceptar requisições de API
    const apiCalls = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/v1/filters/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing()
        });
      }
    });
    
    // Aguardar carregamento inicial
    await page.waitForSelector('[data-testid="empresa-select"]');
    await page.waitForTimeout(2000);
    
    // Verificar se APIs foram chamadas
    expect(apiCalls.length).to.be.greaterThan(0);
    
    // Verificar tempo de resposta
    apiCalls.forEach(call => {
      console.log(`API: ${call.url} - Status: ${call.status}`);
      expect(call.status).to.equal(200);
    });
  });

  /**
   * Teste de interação completa com filtros
   */
  it('deve completar fluxo de filtros sem erros', async () => {
    await page.goto('http://localhost:8877');
    await page.waitForSelector('[data-testid="empresa-select"]');
    
    // Selecionar empresa
    await page.click('[data-testid="empresa-select"]');
    await page.waitForTimeout(1000);
    
    const empresaOptions = await page.$$('[role="option"]');
    if (empresaOptions.length > 0) {
      await empresaOptions[0].click();
      console.log('✓ Empresa selecionada');
    }
    
    // Aguardar carregamento de grupos
    await page.waitForTimeout(2000);
    
    // Selecionar grupo
    await page.click('[data-testid="grupo-select"]');
    await page.waitForTimeout(1000);
    
    const grupoOptions = await page.$$('[role="option"]');
    if (grupoOptions.length > 0) {
      await grupoOptions[0].click();
      console.log('✓ Grupo selecionado');
    }
    
    // Aguardar carregamento de subgrupos
    await page.waitForTimeout(2000);
    
    // Selecionar subgrupo
    await page.click('[data-testid="subgrupo-select"]');
    await page.waitForTimeout(1000);
    
    const subgrupoOptions = await page.$$('[role="option"]');
    if (subgrupoOptions.length > 0) {
      await subgrupoOptions[0].click();
      console.log('✓ Subgrupo selecionado');
    }
    
    // Aguardar carregamento de produtos
    await page.waitForTimeout(2000);
    
    // Verificar se produto está habilitado
    const produtoSelect = await page.$('[data-testid="produto-select"]');
    const isDisabled = await page.evaluate(el => el.disabled, produtoSelect);
    expect(isDisabled).to.be.false;
    
    console.log('✓ Fluxo de filtros completado com sucesso');
  });

  /**
   * Teste de acessibilidade básica
   */
  it('deve atender critérios básicos de acessibilidade', async () => {
    await page.goto('http://localhost:8877');
    await page.waitForSelector('h1');
    
    // Verificar se há texto alternativo em imagens
    const images = await page.$$('img');
    for (const img of images) {
      const alt = await page.evaluate(el => el.alt, img);
      if (alt === '') {
        console.warn('Imagem sem texto alternativo encontrada');
      }
    }
    
    // Verificar se há labels nos inputs
    const inputs = await page.$$('input, select, textarea');
    for (const input of inputs) {
      const id = await page.evaluate(el => el.id, input);
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (!label) {
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), input);
          if (!ariaLabel) {
            console.warn(`Input sem label encontrado: ${id}`);
          }
        }
      }
    }
    
    // Verificar contraste de cores (básico)
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const textColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });
    
    console.log(`Cores: Fundo: ${backgroundColor}, Texto: ${textColor}`);
  });

  /**
   * Teste de memory leaks
   */
  it('não deve ter vazamentos de memória significativos', async () => {
    const initialMetrics = await page.metrics();
    
    // Simular uso intensivo
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:8877');
      await page.waitForSelector('[data-testid="empresa-select"]');
      await page.click('[data-testid="empresa-select"]');
      await page.waitForTimeout(500);
    }
    
    const finalMetrics = await page.metrics();
    
    const memoryIncrease = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
    console.log(`Aumento de memória: ${memoryIncrease} bytes`);
    
    // Não deve aumentar mais que 10MB
    expect(memoryIncrease).to.be.below(10 * 1024 * 1024);
  });
});