'use client';

import { useRouter } from 'next/navigation';
import { Briefcase, ExternalLink, Plus, Loader2 } from 'lucide-react';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';

/**
 * Card de visualização do Orçamento (N.O.N.) vinculado ao Lead.
 * Apenas leitura — edição em /crm/oportunidade-de-negocio/[id].
 *
 * Quando não há orçamento e o lead pode receber um, mostra CTA "Criar".
 *
 * Identidade Workshop: eyebrow mono UPPERCASE, número em mono destacado,
 * StatusBadge canônico, sem glass-card.
 */
export default function LeadOrcamentoCard({
  orcamento,
  isTerminalSale,
  isCancelado,
  creatingOrcamento,
  onCreateOrcamento,
}) {
  const router = useRouter();
  const canCreate = !isTerminalSale && !isCancelado && !orcamento;

  // Caso: orçamento vinculado
  if (orcamento) {
    return (
      <article className="bg-(--surface-2) border border-(--gold)/20 rounded-2xl p-5 hover:border-(--gold)/40 transition-colors flex flex-col">
        <header className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={12} className="text-(--gold)" />
            <h3 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
              Oportunidade de Negócio
            </h3>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/crm/oportunidade-de-negocio/${orcamento.id}`)}
            className="inline-flex items-center gap-1 text-xs font-medium text-(--gold) hover:text-(--gold-hover) transition-colors"
            title="Abrir orçamento"
          >
            Abrir <ExternalLink size={11} />
          </button>
        </header>

        <div className="mb-4">
          <p className="font-mono text-xl font-semibold text-(--gold) tabular-nums tracking-tight">
            {orcamento.numero}
          </p>
          <div className="mt-2">
            <OrcamentoStatusBadge status={orcamento.status} size="xs" />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {orcamento.criadoPor?.nome && (
            <>
              <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">Criado por</dt>
              <dd className="text-(--text-secondary) text-right truncate">{orcamento.criadoPor.nome}</dd>
            </>
          )}
          {orcamento.createdAt && (
            <>
              <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">Criado</dt>
              <dd className="font-mono text-(--text-secondary) tabular-nums text-right">
                {new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}
              </dd>
            </>
          )}
          {orcamento.motivoCancelamento && (
            <>
              <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">Motivo</dt>
              <dd className="text-(--text-secondary) text-right truncate" title={orcamento.motivoCancelamento}>
                {orcamento.motivoCancelamento}
              </dd>
            </>
          )}
        </dl>
      </article>
    );
  }

  // Caso: pode criar orçamento (CTA)
  if (canCreate) {
    return (
      <button
        type="button"
        onClick={onCreateOrcamento}
        disabled={creatingOrcamento}
        className="w-full text-left bg-(--surface-2) border border-dashed border-(--border) rounded-2xl p-5 hover:border-(--gold) hover:bg-(--gold-soft)/20 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col"
      >
        <header className="flex items-center gap-2 mb-4">
          <Briefcase size={12} className="text-(--text-faint) group-hover:text-(--gold) transition-colors" />
          <h3 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
            Oportunidade de Negócio
          </h3>
        </header>

        <div className="flex-1 flex flex-col items-start justify-center gap-3 py-2">
          <p className="text-sm text-(--text-muted) group-hover:text-(--text-secondary) transition-colors">
            Nenhum orçamento vinculado a este lead.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-(--gold) group-hover:text-(--gold-hover) transition-colors">
            {creatingOrcamento ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Criando…
              </>
            ) : (
              <>
                <Plus size={14} />
                Criar oportunidade
              </>
            )}
          </div>
        </div>
      </button>
    );
  }

  // Caso: lead terminal/cancelado sem orçamento (não pode criar)
  return (
    <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-5">
      <header className="flex items-center gap-2 mb-3">
        <Briefcase size={12} className="text-(--text-faint)" />
        <h3 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
          Oportunidade de Negócio
        </h3>
      </header>
      <p className="text-sm text-(--text-muted)">
        {isCancelado ? 'Lead cancelado — orçamento indisponível.' : 'Sem orçamento vinculado.'}
      </p>
    </div>
  );
}
