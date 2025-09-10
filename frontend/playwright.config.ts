import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/puppeteer/**',
  /* Executar testes em paralelo */
  fullyParallel: true,
  /* Falhar o build se você deixou test.only no código fonte */
  forbidOnly: !!process.env.CI,
  /* Retry nos testes que falharam no CI */
  retries: process.env.CI ? 2 : 0,
  /* Opt out do paralelismo no CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter para usar. Veja https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Configurações compartilhadas para todos os projetos abaixo */
  use: {
    /* URL base para usar em ações como `await page.goto('/')` */
    baseURL: 'http://localhost:8877',
    /* Coletar trace quando retry um teste falhou */
    trace: 'on-first-retry',
    /* Screenshot apenas quando falhar */
    screenshot: 'only-on-failure',
    /* Video apenas quando falhar */
    video: 'retain-on-failure',
  },

  /* Configurar projetos para principais navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Testes em dispositivos móveis */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Executar seu servidor de desenvolvimento local antes de iniciar os testes */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8877',
    reuseExistingServer: !process.env.CI,
  },
});