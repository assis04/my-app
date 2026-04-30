import { test as base, expect } from '@playwright/test';

/**
 * Fixtures compartilhadas:
 *  - login(): faz login via UI usando E2E_USER_EMAIL / E2E_USER_PASSWORD
 *    e retorna a página já autenticada
 *
 * Por que login via UI vs cookie injection:
 *  - exercita o fluxo de auth real (CORS + httpOnly cookie + sameSite)
 *  - pega regressões de login (mais valor que vazar pra spec individual)
 *  - lento (~2s por spec) mas vale a cobertura
 *
 * Em CI com muitos specs, considerar storage state cacheado em globalSetup.
 */

function getCreds() {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL e E2E_USER_PASSWORD são obrigatórios. Definir no shell ou em .env.test (não commitar).',
    );
  }
  return { email, password };
}

export const test = base.extend({
  loggedInPage: async ({ page }, use) => {
    const { email, password } = getCreds();

    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Aguarda redirect pra home autenticada (ou alterar-senha se mustChangePassword)
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });

    await use(page);
  },
});

export { expect };
