import { test, expect } from './fixtures.js';

test.describe('CRM — criar lead manual', () => {
  test('cria lead com nome+celular e aparece na listagem', async ({ loggedInPage: page }) => {
    const stamp = Date.now();
    const nome = `Teste E2E ${stamp}`;
    const celular = `1198${String(stamp).slice(-7)}`;

    await page.goto('/crm/leads/novo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5_000 });

    await page.getByLabel(/nome/i).first().fill(nome);
    await page.getByLabel(/celular|telefone/i).first().fill(celular);

    // Submeter
    await page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click();

    // Esperar redirect ou toast de sucesso
    await page.waitForURL(/\/crm\/leads(\/\d+)?(\?|$)/, { timeout: 10_000 });

    // Confirmar visível na listagem
    await page.goto('/crm/leads');
    await expect(page.getByText(nome)).toBeVisible({ timeout: 10_000 });
  });
});
