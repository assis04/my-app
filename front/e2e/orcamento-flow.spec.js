import { test, expect } from './fixtures.js';

test.describe('CRM — fluxo de Oportunidade de Negócio (Orçamento)', () => {
  test('cria O.N. via botão na tela do Lead, cancela com motivo, reativa', async ({ loggedInPage: page }) => {
    // Pré-condição: há um lead que ainda não tem orçamento vinculado
    await page.goto('/crm/leads');

    // Pega primeiro lead da listagem
    const firstLead = page.getByRole('row').nth(1); // index 0 é o header
    await firstLead.waitFor({ timeout: 10_000 });
    await firstLead.click();
    await page.waitForURL(/\/crm\/leads\/\d+/, { timeout: 10_000 });

    // ── 1. Criar O.N. ─────────────────────────────────────────────────
    const novaOpBtn = page.getByRole('button', { name: /nova oportunidade|nova o\.?n\.?/i });
    if (!(await novaOpBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Lead já tem orçamento vinculado — escolher outro lead manualmente');
    }
    await novaOpBtn.click();

    // Confirma criação (pode ter modal de confirmação)
    const confirmBtn = page.getByRole('button', { name: /confirmar|criar|sim/i });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    // Status inicial deve ser "Nova O.N."
    await expect(page.getByText(/nova o\.?n\.?/i).first()).toBeVisible({ timeout: 10_000 });

    // ── 2. Cancelar com motivo ────────────────────────────────────────
    await page.getByRole('button', { name: /cancelar/i }).first().click();

    // Modal CancelOrcamentoDialog aparece
    const motivoSelect = page.getByLabel(/motivo/i);
    await motivoSelect.waitFor({ timeout: 5_000 });
    await motivoSelect.selectOption({ label: /desist/i });

    await page.getByRole('button', { name: /cancelar orçamento|confirmar/i }).click();

    // Status muda para "Cancelado"
    await expect(page.getByText(/cancelado/i).first()).toBeVisible({ timeout: 10_000 });

    // ── 3. Reativar ───────────────────────────────────────────────────
    await page.getByRole('button', { name: /reativar/i }).first().click();
    const reativarConfirm = page.getByRole('button', { name: /confirmar|reativar/i }).first();
    if (await reativarConfirm.isVisible().catch(() => false)) {
      await reativarConfirm.click();
    }

    // Volta para "Nova O.N."
    await expect(page.getByText(/nova o\.?n\.?/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
