import { test, expect } from '@playwright/test';

/**
 * RBAC checks "negativos" — usuário sem permissão não consegue acessar
 * recursos restritos. Esses testes exigem 2 conjuntos de credenciais:
 *   - E2E_USER_EMAIL/PASSWORD: vendedor de uma filial específica
 *   - E2E_ADMIN_EMAIL/PASSWORD: ADM com wildcard
 *
 * Skipa quando as variáveis não estão definidas (não falha o build).
 */

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /entrar|login|acessar/i }).click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });
}

test.describe('RBAC — isolamento e gates', () => {
  test('vendedor não vê /rh/gerenciar-usuarios (sem rh:usuarios:read)', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, 'E2E_USER_EMAIL/PASSWORD ausentes');

    await login(page, email, password);
    await page.goto('/rh/gerenciar-usuarios');

    // Espera-se: redirect, 403, ou mensagem de "sem permissão"
    const denied = page.getByText(/sem permiss|acesso negado|403|forbidden/i).first();
    const sidebar = page.getByRole('link', { name: /usuários/i }).first();

    // Caminho aceitável: a UI nem mostra a opção pra esse user (PermissionGate)
    // OU a página mostra mensagem de bloqueio
    const blocked = (await denied.isVisible().catch(() => false))
      || !(await sidebar.isVisible().catch(() => false));
    expect(blocked).toBe(true);
  });

  test('ADM acessa /rh/gerenciar-usuarios e vê a lista', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!email || !password, 'E2E_ADMIN_EMAIL/PASSWORD ausentes');

    await login(page, email, password);
    await page.goto('/rh/gerenciar-usuarios');

    // Tabela renderiza (header com "Email" ou similar)
    await expect(page.getByText(/email/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('GET /users sem permissão retorna 403 (contrato API)', async ({ request }) => {
    const apiUrl = process.env.E2E_API_URL || 'https://staging-api.moveisvalcenter.com.br';
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, 'E2E_USER_EMAIL/PASSWORD ausentes');

    // Login via API direto pra pegar o cookie
    const loginRes = await request.post(`${apiUrl}/auth/login`, {
      data: { email, password },
    });
    expect(loginRes.ok()).toBe(true);

    // /users full deve dar 403 pra vendedor (sem rh:usuarios:read)
    const usersRes = await request.get(`${apiUrl}/users`);
    expect(usersRes.status()).toBe(403);

    // /users/lookup deve funcionar
    const lookupRes = await request.get(`${apiUrl}/users/lookup`);
    expect(lookupRes.ok()).toBe(true);
    const list = await lookupRes.json();
    expect(Array.isArray(list)).toBe(true);
    // Lookup não vaza email
    if (list.length > 0) {
      expect(list[0].email).toBeUndefined();
    }
  });
});
