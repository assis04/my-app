/**
 * One-off data normalization script — Task #4 (plan §3 Migration 5).
 *
 * Purpose: bring existing Lead rows into line with spec §7:
 *   - Legacy status values ("Novo", "Prospecção", "Ativo") → "Em prospecção"
 *   - Null/empty status → "Em prospecção"
 *   - etapa → derived from status per STATUS_TO_ETAPA mapping
 *
 * Safety:
 *   - Idempotent: safe to re-run any number of times
 *   - Non-destructive: only updates rows matching legacy conditions
 *   - Dry-run mode: pass --dry-run to preview changes without writing
 *   - Logs before/after counts
 *
 * Usage (on staging):
 *   docker exec crm-backend-stg node scripts/normalize-lead-status-etapa.js --dry-run
 *   docker exec crm-backend-stg node scripts/normalize-lead-status-etapa.js
 *
 * Usage (on production): only after staging validation.
 *   docker exec crm-backend node scripts/normalize-lead-status-etapa.js --dry-run
 *   docker exec crm-backend node scripts/normalize-lead-status-etapa.js
 */

import prisma from '../src/config/prisma.js';
import {
  LeadStatus,
  getAllStatuses,
  STATUS_TO_ETAPA,
} from '../src/domain/leadStatus.js';

const DRY_RUN = process.argv.includes('--dry-run');

const LEGACY_STATUS_VALUES = ['Novo', 'Prospecção', 'Ativo', ''];

function logSection(title) {
  console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

async function snapshotStatusCounts() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(status, '<NULL>') AS status, COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
    GROUP BY status
    ORDER BY count DESC
  `);
  return rows;
}

async function snapshotEtapaMismatch() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      status,
      COALESCE(etapa, '<NULL>') AS etapa_atual,
      COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
    GROUP BY status, etapa
    ORDER BY count DESC
  `);
  return rows;
}

async function normalizeStatus() {
  logSection('Passo 1: normalizar status legados');

  const before = await snapshotStatusCounts();
  console.log('Distribuição atual de status:');
  console.table(before);

  if (DRY_RUN) {
    const affected = await prisma.lead.count({
      where: {
        OR: [
          { status: { in: LEGACY_STATUS_VALUES } },
          { status: null },
        ],
      },
    });
    console.log(`[DRY RUN] Atualizaria ${affected} leads para status="${LeadStatus.EM_PROSPECCAO}"`);
    return 0;
  }

  const result = await prisma.lead.updateMany({
    where: {
      OR: [
        { status: { in: LEGACY_STATUS_VALUES } },
        { status: null },
      ],
    },
    data: { status: LeadStatus.EM_PROSPECCAO },
  });

  console.log(`Atualizados: ${result.count} leads → status="${LeadStatus.EM_PROSPECCAO}"`);
  return result.count;
}

async function normalizeEtapa() {
  logSection('Passo 2: derivar etapa a partir do status');

  const before = await snapshotEtapaMismatch();
  console.log('Distribuição atual (status × etapa):');
  console.table(before);

  let totalUpdated = 0;

  for (const status of getAllStatuses()) {
    const correctEtapa = STATUS_TO_ETAPA[status];

    const where = {
      status,
      OR: [
        { etapa: { not: correctEtapa } },
        { etapa: null },
      ],
    };

    if (DRY_RUN) {
      const affected = await prisma.lead.count({ where });
      if (affected > 0) {
        console.log(`[DRY RUN] ${affected} leads com status="${status}" teriam etapa corrigida → "${correctEtapa}"`);
      }
      totalUpdated += affected;
      continue;
    }

    const result = await prisma.lead.updateMany({ where, data: { etapa: correctEtapa } });
    if (result.count > 0) {
      console.log(`${result.count} leads status="${status}" → etapa="${correctEtapa}"`);
    }
    totalUpdated += result.count;
  }

  // Leads com status fora do enum canônico (não deveria acontecer após passo 1)
  const strangeStatus = await prisma.$queryRawUnsafe(`
    SELECT status, COUNT(*)::int AS count
    FROM leads
    WHERE deleted_at IS NULL
      AND status NOT IN (${getAllStatuses().map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')})
    GROUP BY status
  `);

  if (strangeStatus.length > 0) {
    console.warn('⚠️  Leads com status fora do enum canônico (não foram normalizados):');
    console.table(strangeStatus);
    console.warn('   → Verificar manualmente antes de rodar novamente.');
  }

  console.log(`Total de leads com etapa corrigida: ${totalUpdated}`);
  return totalUpdated;
}

async function main() {
  const mode = DRY_RUN ? '🔍 DRY RUN' : '✍️  APPLYING';
  console.log(`\n${mode} — normalize-lead-status-etapa.js`);
  console.log(`Spec reference: specs/crm.md §7 / specs/crm-plan.md §3 Migration 5`);

  const statusUpdated = await normalizeStatus();
  const etapaUpdated = await normalizeEtapa();

  logSection('Resumo');
  console.log(`Status normalizados: ${statusUpdated}`);
  console.log(`Etapas normalizadas: ${etapaUpdated}`);

  if (!DRY_RUN) {
    logSection('Snapshot final');
    console.table(await snapshotStatusCounts());
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
