/**
 * One-off data normalization script — Temperatura rename (2026-05-07).
 *
 * Purpose: alinhar `Lead.temperatura` ao novo enum canônico de 4 valores:
 *   Antigo                → Novo
 *   ─────────────────────   ───────────────────
 *   'Muito interessado'   → 'Muito interesse'
 *   'Interessado'         → 'Pouco interesse'
 *   'Sem interesse'       → 'Sem interesse'  (mantém)
 *   NULL / ''             → 'Sem contato'    (default explícito)
 *
 * Spec: backend/src/domain/leadTemperatura.js
 *
 * Safety:
 *   - Idempotente: pode ser re-executado, só toca em valores legados ou nulls
 *   - Não-destrutivo: não mexe em leads que já têm um dos 4 valores novos
 *   - Dry-run: --dry-run mostra contagem sem aplicar
 *
 * Usage (staging):
 *   docker exec crm-backend-stg node scripts/normalize-lead-temperatura.js --dry-run
 *   docker exec crm-backend-stg node scripts/normalize-lead-temperatura.js
 *
 * Usage (production): só após validação em staging.
 *   docker exec crm-backend node scripts/normalize-lead-temperatura.js --dry-run
 *   docker exec crm-backend node scripts/normalize-lead-temperatura.js
 */

import prisma from '../src/config/prisma.js';
import { LeadTemperatura, getAllTemperaturas } from '../src/domain/leadTemperatura.js';

const DRY_RUN = process.argv.includes('--dry-run');

const RENAMES = [
  { from: 'Muito interessado', to: LeadTemperatura.MUITO_INTERESSE },
  { from: 'Interessado',       to: LeadTemperatura.POUCO_INTERESSE },
];

function logSection(title) {
  console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function logRows(label, rows) {
  if (!rows || rows.length === 0) {
    console.log(`${label}: (vazio)`);
    return;
  }
  console.log(label);
  console.table(rows);
}

async function snapshotTemperaturaCounts() {
  return prisma.$queryRawUnsafe(`
    SELECT COALESCE(temperatura, '<NULL>') AS temperatura, COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
    GROUP BY temperatura
    ORDER BY count DESC
  `);
}

async function renameLegacyValues() {
  logSection('Passo 1: renomear valores legados');

  let total = 0;

  for (const { from, to } of RENAMES) {
    if (DRY_RUN) {
      const [{ count }] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM leads
        WHERE deleted_at IS NULL AND temperatura = ${from}
      `;
      if (count > 0) {
        console.log(`[DRY RUN] ${count} leads "${from}" → "${to}"`);
      }
      total += count;
      continue;
    }

    const affected = await prisma.$executeRaw`
      UPDATE leads
      SET temperatura = ${to}
      WHERE deleted_at IS NULL AND temperatura = ${from}
    `;
    if (affected > 0) {
      console.log(`${affected} leads "${from}" → "${to}"`);
    }
    total += affected;
  }

  console.log(`Total renomeado: ${total}`);
  return total;
}

async function backfillNullToSemContato() {
  logSection('Passo 2: backfill de null/empty → "Sem contato"');

  const target = LeadTemperatura.SEM_CONTATO;

  if (DRY_RUN) {
    const [{ count }] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM leads
      WHERE deleted_at IS NULL
        AND (temperatura IS NULL OR temperatura = '')
    `;
    console.log(`[DRY RUN] ${count} leads NULL/'' → "${target}"`);
    return count;
  }

  const affected = await prisma.$executeRaw`
    UPDATE leads
    SET temperatura = ${target}
    WHERE deleted_at IS NULL
      AND (temperatura IS NULL OR temperatura = '')
  `;
  console.log(`${affected} leads NULL/'' → "${target}"`);
  return affected;
}

async function detectStrangeValues() {
  const valid = getAllTemperaturas();
  const literals = valid.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');

  const rows = await prisma.$queryRawUnsafe(`
    SELECT temperatura, COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
      AND temperatura IS NOT NULL
      AND temperatura NOT IN (${literals})
    GROUP BY temperatura
  `);

  if (rows && rows.length > 0) {
    console.warn('⚠️  Leads com temperatura fora do enum canônico (não foram normalizados):');
    console.table(rows);
    console.warn('   → Verificar manualmente antes de rodar novamente.');
  }
}

async function main() {
  const mode = DRY_RUN ? '🔍 DRY RUN' : '✍️  APPLYING';
  console.log(`\n${mode} — normalize-lead-temperatura.js (2026-05-07 rename)`);

  logRows('Distribuição atual:', await snapshotTemperaturaCounts());

  const renamed = await renameLegacyValues();
  const backfilled = await backfillNullToSemContato();

  await detectStrangeValues();

  logSection('Resumo');
  console.log(`Renomeados:  ${renamed}`);
  console.log(`Backfilled:  ${backfilled}`);

  if (!DRY_RUN) {
    logSection('Snapshot final');
    logRows('Distribuição final:', await snapshotTemperaturaCounts());
  }
}

main()
  .catch((err) => {
    console.error('❌ Falha na normalização:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
