/**
 * One-off data backfill — Task #5 (plan §3 Migration 2).
 *
 * Purpose: create one KanbanCard per existing Lead that doesn't have one yet.
 *   - coluna = STATUS_TO_ETAPA[lead.status] (see domain/leadStatus.js)
 *   - posicao = MAX(posicao) + 1 within the target coluna (stable ordering)
 *
 * Safety:
 *   - Idempotent: only creates cards for leads missing one (LEFT JOIN IS NULL)
 *   - Dry-run mode via --dry-run
 *   - Batches to avoid memory spikes on large datasets
 *   - Logs per-coluna counts before/after
 *
 * Prerequisites:
 *   - Run AFTER scripts/normalize-lead-status-etapa.js (so statuses are canonical)
 *   - Run AFTER `prisma db push` applied the KanbanCard model
 *
 * Usage:
 *   docker exec crm-backend-stg node scripts/backfill-kanban-cards.js --dry-run
 *   docker exec crm-backend-stg node scripts/backfill-kanban-cards.js
 *
 * Acceptance (plan §6 task #5):
 *   SELECT COUNT(*) FROM leads l
 *   LEFT JOIN kanban_cards k ON k.lead_id = l.id
 *   WHERE k.id IS NULL AND l.deleted_at IS NULL
 *   → returns 0
 */

import prisma from '../src/config/prisma.js';
import {
  getAllStatuses,
  STATUS_TO_ETAPA,
  isValidStatus,
} from '../src/domain/leadStatus.js';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

function logSection(title) {
  console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

async function countOrphanLeads() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM leads l
    LEFT JOIN kanban_cards k ON k.lead_id = l.id
    WHERE k.id IS NULL AND l.deleted_at IS NULL
  `);
  return result[0].count;
}

async function snapshotKanbanByColuna() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT coluna, COUNT(*)::int AS count
    FROM kanban_cards
    GROUP BY coluna
    ORDER BY count DESC
  `);
  return rows;
}

async function getNextPosicaoPerColuna() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT coluna, COALESCE(MAX(posicao), 0)::int AS max_posicao
    FROM kanban_cards
    GROUP BY coluna
  `);
  const map = {};
  for (const r of rows) map[r.coluna] = r.max_posicao;
  return map;
}

async function backfillBatch(posicaoCursor) {
  const orphans = await prisma.$queryRawUnsafe(`
    SELECT l.id AS "leadId", l.status
    FROM leads l
    LEFT JOIN kanban_cards k ON k.lead_id = l.id
    WHERE k.id IS NULL AND l.deleted_at IS NULL
    ORDER BY l.id ASC
    LIMIT ${BATCH_SIZE}
  `);

  if (orphans.length === 0) return 0;

  const rowsToInsert = [];
  const skippedUnknownStatus = [];

  for (const { leadId, status } of orphans) {
    if (!isValidStatus(status)) {
      skippedUnknownStatus.push({ leadId, status });
      continue;
    }
    const coluna = STATUS_TO_ETAPA[status];
    posicaoCursor[coluna] = (posicaoCursor[coluna] ?? 0) + 1;
    rowsToInsert.push({ leadId, coluna, posicao: posicaoCursor[coluna] });
  }

  if (skippedUnknownStatus.length > 0) {
    console.warn(`⚠️  Pulados ${skippedUnknownStatus.length} leads com status fora do enum:`);
    console.table(skippedUnknownStatus.slice(0, 10));
    if (skippedUnknownStatus.length > 10) console.warn(`   ... e mais ${skippedUnknownStatus.length - 10}`);
    console.warn('   → Rodar scripts/normalize-lead-status-etapa.js primeiro.');
  }

  if (DRY_RUN) return rowsToInsert.length;

  if (rowsToInsert.length === 0) return 0;

  await prisma.kanbanCard.createMany({
    data: rowsToInsert,
    skipDuplicates: true, // defesa extra caso rodem concorrentemente
  });

  return rowsToInsert.length;
}

async function main() {
  const mode = DRY_RUN ? '🔍 DRY RUN' : '✍️  APPLYING';
  console.log(`\n${mode} — backfill-kanban-cards.js`);
  console.log(`Spec reference: specs/crm.md §4.6 / specs/crm-plan.md §3 Migration 2`);

  logSection('Estado inicial');
  const orphansBefore = await countOrphanLeads();
  console.log(`Leads sem KanbanCard: ${orphansBefore}`);
  const beforeByColuna = await snapshotKanbanByColuna();
  console.log('KanbanCards existentes por coluna:');
  console.table(beforeByColuna);

  if (orphansBefore === 0) {
    console.log('✅ Nada a fazer — todos os leads já têm KanbanCard.');
    return;
  }

  logSection(DRY_RUN ? 'Preview dos batches' : 'Aplicando backfill em batches');
  const posicaoCursor = await getNextPosicaoPerColuna();
  console.log('Posição inicial por coluna (usada como cursor):');
  console.table(posicaoCursor);

  let totalInserted = 0;
  let iteration = 0;

  // Loop até não sobrarem órfãos (ou DRY_RUN — um batch bastante pro preview)
  for (;;) {
    iteration += 1;
    const inserted = await backfillBatch(posicaoCursor);
    totalInserted += inserted;
    console.log(`  Batch #${iteration}: ${inserted} cards`);

    if (DRY_RUN) break; // em dry-run mostramos um batch só (suficiente pro preview)
    if (inserted === 0) break;
    if (inserted < BATCH_SIZE) break; // último batch não-cheio
  }

  logSection('Resumo');
  console.log(`Cards ${DRY_RUN ? 'que seriam criados' : 'criados'}: ${totalInserted}`);

  if (!DRY_RUN) {
    const orphansAfter = await countOrphanLeads();
    console.log(`Leads órfãos remanescentes: ${orphansAfter}`);
    if (orphansAfter > 0) {
      console.warn(`⚠️  Ainda restam ${orphansAfter} leads sem KanbanCard. Provavelmente têm status inválido — ver warnings acima.`);
      process.exitCode = 2;
    } else {
      console.log('✅ Critério de aceitação atingido (plan §6 task #5): todos os leads têm KanbanCard.');
    }
    console.log('\nSnapshot final:');
    console.table(await snapshotKanbanByColuna());
  }
}

main()
  .catch((err) => {
    console.error('❌ Falha no backfill:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
