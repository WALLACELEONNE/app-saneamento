const puppeteer = require('puppeteer');
const { expect } = require('chai');

/**
 * Teste simples para verificar se o Puppeteer está funcionando
 */
describe('Teste Simples - Puppeteer', () => {
  let browser;
  let page;

  before(async function() {
    this.timeout(30000);
    console.log('Iniciando Puppeteer...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  after(async function() {
    this.timeout(10000);
    if (browser) {
      await browser.close();
    }
  });

  /**
   * Teste básico de conectividade
   */
  it('deve conseguir acessar a página inicial', async function() {
    this.timeout(15000);
    
    try {
      console.log('Acessando http://localhost:8877...');
      await page.goto('http://localhost:8877', {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      
      // Verificar se a página carregou
      const title = await page.title();
      console.log(`Título da página: ${title}`);
      
      // Verificar se há conteúdo na página
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).to.be.greaterThan(0);
      
      console.log('✓ Página carregada com sucesso');
    } catch (error) {
      console.error('Erro ao acessar a página:', error.message);
      throw error;
    }
  });

  /**
   * Teste de elementos básicos
   */
  it('deve encontrar elementos básicos na página', async function() {
    this.timeout(10000);
    
    try {
      await page.goto('http://localhost:8877');
      await page.waitForTimeout(2000);
      
      // Verificar se há um título h1
      const h1Elements = await page.$$('h1');
      console.log(`Encontrados ${h1Elements.length} elementos h1`);
      
      // Verificar se há selects na página
      const selectElements = await page.$$('select');
      console.log(`Encontrados ${selectElements.length} elementos select`);
      
      // Verificar se há divs (estrutura básica)
      const divElements = await page.$$('div');
      expect(divElements.length).to.be.greaterThan(0);
      
      console.log('✓ Elementos básicos encontrados');
    } catch (error) {
      console.error('Erro ao verificar elementos:', error.message);
      throw error;
    }
  });

  /**
   * Teste de performance básica
   */
  it('deve carregar em tempo razoável', async function() {
    this.timeout(10000);
    
    const startTime = Date.now();
    
    try {
      await page.goto('http://localhost:8877', {
        waitUntil: 'networkidle2'
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`Tempo de carregamento: ${loadTime}ms`);
      
      // Deve carregar em menos de 5 segundos
      expect(loadTime).to.be.below(5000);
      
      console.log('✓ Performance adequada');
    } catch (error) {
      console.error('Erro no teste de performance:', error.message);
      throw error;
    }
  });

  /**
   * Teste de responsividade básica
   */
  it('deve ser responsivo', async function() {
    this.timeout(10000);
    
    const viewports = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    try {
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto('http://localhost:8877');
        await page.waitForTimeout(1000);
        
        // Verificar se a página ainda tem conteúdo
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.length).to.be.greaterThan(0);
        
        console.log(`✓ Responsivo em ${viewport.name} (${viewport.width}x${viewport.height})`);
      }
    } catch (error) {
      console.error('Erro no teste de responsividade:', error.message);
      throw error;
    }
  });
});