const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Configuração e setup para testes com Puppeteer
 * Gerencia o servidor de desenvolvimento e configurações globais
 */
class TestSetup {
  constructor() {
    this.devServer = null;
    this.browser = null;
  }

  /**
   * Inicia o servidor de desenvolvimento se não estiver rodando
   */
  async startDevServer() {
    return new Promise((resolve, reject) => {
      console.log('Verificando se o servidor está rodando...');
      
      // Verificar se o servidor já está rodando
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: 8877,
        path: '/',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        console.log('✓ Servidor já está rodando na porta 8877');
        resolve();
      });
      
      req.on('error', () => {
        console.log('Iniciando servidor de desenvolvimento...');
        
        // Iniciar servidor se não estiver rodando
        this.devServer = spawn('npm', ['run', 'dev'], {
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe',
          shell: true
        });
        
        this.devServer.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`Dev Server: ${output}`);
          
          // Aguardar até o servidor estar pronto
          if (output.includes('Ready') || output.includes('localhost:8877')) {
            setTimeout(resolve, 2000); // Aguardar 2s para garantir que está pronto
          }
        });
        
        this.devServer.stderr.on('data', (data) => {
          console.error(`Dev Server Error: ${data}`);
        });
        
        this.devServer.on('error', (error) => {
          console.error('Erro ao iniciar servidor:', error);
          reject(error);
        });
        
        // Timeout de 30 segundos
        setTimeout(() => {
          reject(new Error('Timeout ao iniciar servidor'));
        }, 30000);
      });
      
      req.end();
    });
  }

  /**
   * Para o servidor de desenvolvimento
   */
  async stopDevServer() {
    if (this.devServer) {
      console.log('Parando servidor de desenvolvimento...');
      this.devServer.kill('SIGTERM');
      this.devServer = null;
    }
  }

  /**
   * Configuração global do Puppeteer
   */
  async setupPuppeteer() {
    console.log('Configurando Puppeteer...');
    
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
      devtools: process.env.DEVTOOLS === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    return this.browser;
  }

  /**
   * Limpa recursos do Puppeteer
   */
  async teardownPuppeteer() {
    if (this.browser) {
      console.log('Fechando Puppeteer...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Setup completo para testes
   */
  async setup() {
    try {
      await this.startDevServer();
      await this.setupPuppeteer();
      console.log('✓ Setup completo - pronto para testes');
    } catch (error) {
      console.error('Erro no setup:', error);
      await this.teardown();
      throw error;
    }
  }

  /**
   * Limpeza completa após testes
   */
  async teardown() {
    await this.teardownPuppeteer();
    await this.stopDevServer();
    console.log('✓ Teardown completo');
  }
}

// Instância global para uso nos testes
const testSetup = new TestSetup();

// Hooks globais removidos - serão definidos em cada teste individual

// Exportar para uso em testes individuais
module.exports = testSetup;