import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Static analysis do crmRoutes.js. Objetivo: prevenir regressão onde alguém
// adiciona uma rota sem authMiddleware ou authorizeAnyPermission.
//
// Não é um E2E — não exerce o Express. Mas garante que o gate mínimo de
// autenticação/autorização está DECLARADO em cada linha de rota.

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = resolve(__dirname, '../routes/crmRoutes.js');

async function readRoutesFile() {
  return readFile(ROUTES_PATH, 'utf-8');
}

function extractRouteLines(source) {
  // Captura: router.get(..., router.post(..., etc. — multi-linha também
  const lines = source.split('\n');
  return lines.filter((l) => /^\s*router\.(get|post|put|patch|delete)\(/.test(l));
}

describe('crmRoutes.js — gates de segurança estáticos', () => {
  it('TODAS as rotas têm authMiddleware declarado na linha', async () => {
    const src = await readRoutesFile();
    const routes = extractRouteLines(src);
    expect(routes.length).toBeGreaterThan(0); // sanity: achou rotas

    const unauthenticated = routes.filter((l) => !l.includes('authMiddleware'));
    expect(
      unauthenticated,
      `Rotas sem authMiddleware:\n${unauthenticated.join('\n')}`,
    ).toHaveLength(0);
  });

  it('Rotas mutativas (POST/PUT/DELETE) têm authorizeAnyPermission OU check inline', async () => {
    const src = await readRoutesFile();
    const lines = src.split('\n');
    const mutators = lines.filter((l) =>
      /^\s*router\.(post|put|patch|delete)\(/.test(l),
    );

    // Exceção consciente: /queue/toggle-status é self-service (usuário muda
    // própria disponibilidade) + verificação de permissão feita no controller.
    const ungated = mutators.filter(
      (l) =>
        !l.includes('authorizeAnyPermission') &&
        !l.includes('toggle-status'),
    );
    expect(
      ungated,
      `Mutators sem autorização explícita:\n${ungated.join('\n')}`,
    ).toHaveLength(0);
  });

  it('Endpoints do core CRM (Tasks #9-#13) estão declarados', async () => {
    const src = await readRoutesFile();
    // Confirma que as rotas existem (se alguém deletar, test quebra)
    expect(src).toContain("'/leads/:id/status'");
    expect(src).toContain("'/leads/:id/temperatura'");
    expect(src).toContain("'/leads/:id/cancel'");
    expect(src).toContain("'/leads/:id/reactivate'");
    expect(src).toContain("'/leads/:id/history'");
  });

  it('Endpoint /reactivate exige a permissão role-gated crm:leads:reactivate', async () => {
    const src = await readRoutesFile();
    const lines = src.split('\n');
    const reactivateLine = lines.find((l) => l.includes("'/leads/:id/reactivate'"));
    expect(reactivateLine).toBeDefined();
    expect(reactivateLine).toContain('crm:leads:reactivate');
  });
});
