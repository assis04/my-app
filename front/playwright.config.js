import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração Playwright.
 *
 * Estratégia: rodar contra staging ou dev local conforme E2E_BASE_URL.
 * Não há global setup pesado — cada spec faz auth via UI ou usa storage state.
 *
 * Default targets staging porque ele já tem dados reais e exercita o stack
 * inteiro (Traefik + cookies httpOnly + CORS cross-origin frontend↔backend).
 *
 * Variáveis:
 *   E2E_BASE_URL    — URL do front (default: https://staging.moveisvalcenter.com.br)
 *   E2E_USER_EMAIL  — email de usuário de teste pra login
 *   E2E_USER_PASSWORD — senha
 *
 * Uso típico:
 *   npx playwright install   # uma vez, baixa browsers
 *   E2E_USER_EMAIL=qa@... E2E_USER_PASSWORD=... npx playwright test
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test --ui   # local + UI
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://staging.moveisvalcenter.com.br',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
