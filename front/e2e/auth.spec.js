import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('rejeita credenciais inválidas com mensagem clara', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill('inexistente@example.com');
    await page.getByLabel(/senha/i).fill('senha-errada-12345');
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();

    // Mensagem genérica (boa prática — não revela se email existe)
    await expect(
      page.getByText(/inválido|incorret|senha|credenciai/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Não deve sair da rota /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('aceita credenciais válidas e redireciona pra home', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, 'E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes');

    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).click();

    await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('redireciona usuário não autenticado para /login ao acessar rota protegida', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/crm/leads');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
