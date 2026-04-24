/**
 * One-off idempotent seed — Task #20 (plan §6).
 *
 * Grants the CRM core permissions introduced during the
 * Specification-Driven work to the roles that should have them.
 *
 * Scope: only permissions that are ACTUALLY ENFORCED in code today.
 * Other spec §3 permissions (crm:leads:import, :export, :transfer:bulk,
 * crm:accounts:merge) will be seeded when their endpoints land — avoids
 * orphan permissions that grant no real capability.
 *
 * Grants:
 *   crm:leads:edit-after-sale → roles admin (ADM / Administrador / admin)
 *     Enforced by: leadCrmService.updateLead guard + leadTransitionService
 *       transitionStatus/setTemperatura guards (spec §9.14).
 *   crm:leads:reactivate → roles admin + Gerente (GERENTE)
 *     Enforced by: leadTransitionService.reactivateLead (spec §3).
 *
 * Safety:
 *   - Idempotent: re-run is a no-op if roles already have the permissions
 *   - Dry-run mode: --dry-run previews changes without writing
 *   - Warns (não falha) quando um role esperado não existe no DB
 *
 * Usage:
 *   docker exec crm-backend-stg node scripts/seed-crm-permissions.js --dry-run
 *   docker exec crm-backend-stg node scripts/seed-crm-permissions.js
 */

import prisma from '../src/config/prisma.js';
import { ADMIN_ROLES, MANAGER_ROLES } from '../src/utils/roles.js';

const DRY_RUN = process.argv.includes('--dry-run');

const GRANTS = [
  {
    perm: 'crm:leads:edit-after-sale',
    targetRoleNames: ADMIN_ROLES,
    rationale: 'Editar Lead após Venda/Pós-venda (spec §9.14)',
  },
  {
    perm: 'crm:leads:reactivate',
    targetRoleNames: [...ADMIN_ROLES, ...MANAGER_ROLES],
    rationale: 'Reativar Lead cancelado (spec §3 / §6.5)',
  },
  // Permissões da entidade Orçamento (N.O.N.) — specs/crm-non.md
  {
    perm: 'crm:orcamentos:read',
    targetRoleNames: [...ADMIN_ROLES, ...MANAGER_ROLES],
    rationale: 'Listar e ver Orçamentos (specs/crm-non.md §6.4)',
  },
  {
    perm: 'crm:orcamentos:create',
    targetRoleNames: [...ADMIN_ROLES, ...MANAGER_ROLES],
    rationale: 'Criar Orçamento vinculado a um Lead',
  },
  {
    perm: 'crm:orcamentos:update',
    targetRoleNames: [...ADMIN_ROLES, ...MANAGER_ROLES],
    rationale: 'Transição de status, cancelamento e reativação de Orçamento',
  },
  {
    perm: 'crm:orcamentos:delete',
    targetRoleNames: ADMIN_ROLES,
    rationale: 'Excluir Orçamento (apenas ADM)',
  },
];

function logSection(title) {
  console.log(`\n─── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

async function applyGrant(grant) {
  const summary = { granted: [], alreadyHas: [], roleMissing: [] };

  for (const roleName of grant.targetRoleNames) {
    const role = await prisma.role.findUnique({
      where: { nome: roleName },
      select: { id: true, nome: true, permissions: true },
    });

    if (!role) {
      summary.roleMissing.push(roleName);
      continue;
    }

    // '*' wildcard → já cobre tudo, não precisa adicionar
    if (role.permissions.includes('*') || role.permissions.includes(grant.perm)) {
      summary.alreadyHas.push(role.nome);
      continue;
    }

    if (!DRY_RUN) {
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: [...role.permissions, grant.perm] },
      });
    }
    summary.granted.push(role.nome);
  }

  return summary;
}

async function main() {
  const mode = DRY_RUN ? '🔍 DRY RUN' : '✍️  APPLYING';
  console.log(`\n${mode} — seed-crm-permissions.js`);
  console.log('Spec reference: specs/crm.md §3 / specs/crm-plan.md §6 Task #20\n');

  for (const grant of GRANTS) {
    logSection(`Permissão: ${grant.perm}`);
    console.log(`Motivo: ${grant.rationale}`);
    console.log(`Roles alvo: ${grant.targetRoleNames.join(', ')}`);

    const summary = await applyGrant(grant);

    if (summary.granted.length > 0) {
      console.log(`  ${DRY_RUN ? 'Concederia' : 'Concedido'} para: ${summary.granted.join(', ')}`);
    }
    if (summary.alreadyHas.length > 0) {
      console.log(`  Já possui (skip): ${summary.alreadyHas.join(', ')}`);
    }
    if (summary.roleMissing.length > 0) {
      console.warn(
        `  ⚠️  Role(s) inexistente(s) no banco: ${summary.roleMissing.join(', ')}`,
      );
    }
  }

  logSection('Concluído');
  if (DRY_RUN) {
    console.log('Nenhuma mudança foi gravada. Rode sem --dry-run para aplicar.');
  } else {
    console.log('Permissões concedidas. Usuários com essas roles precisam fazer novo login.');
  }
}

main()
  .catch((err) => {
    console.error('❌ Falha no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
