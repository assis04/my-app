import { test, expect } from './fixtures.js';

test.describe('CRM — transição de status do lead', () => {
  test('muda status e registra evento no histórico', async ({ loggedInPage: page }) => {
    // Pré-condição: existe pelo menos um lead em "Em prospecção"
    await page.goto('/crm/leads');

    const firstLeadRow = page.getByRole('row').filter({ has: page.getByText(/em prospec/i) }).first();
    await firstLeadRow.waitFor({ timeout: 10_000 });
    await firstLeadRow.click();

    // Aguarda página de detalhe
    await page.waitForURL(/\/crm\/leads\/\d+/, { timeout: 10_000 });

    // Abre dropdown de status (componente LeadStatusDropdown)
    const statusButton = page.getByRole('button', { name: /em prospec/i }).first();
    await statusButton.click();

    // Escolhe "Aguardando Planta/medidas" — transição válida do estado inicial
    await page.getByRole('menuitem', { name: /aguardando planta/i }).first().click();

    // Em alguns fluxos abre modal de transição (StatusTransitionModal); confirma se houver
    const confirmBtn = page.getByRole('button', { name: /confirmar|aplicar|salvar/i });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // Sucesso: badge mostra novo status
    await expect(page.getByText(/aguardando planta/i).first()).toBeVisible({ timeout: 10_000 });

    // Histórico tem evento STATUS_CHANGED
    await expect(page.getByText(/status.*alterado|alterou.*status|status_changed/i).first())
      .toBeVisible({ timeout: 5_000 });
  });
});
