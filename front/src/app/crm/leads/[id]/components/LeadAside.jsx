'use client';

import { useRouter } from 'next/navigation';
import { User as UserIcon, Briefcase, History, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';
import LeadHistoryTimeline from '@/components/crm/LeadHistoryTimeline';

/**
 * Sidebar do detail page — agrupa contexto secundário em cards compactos:
 *  - Conta vinculada (link pra detalhe da Account)
 *  - Orçamento vinculado (link pra detalhe da O.N. ou CTA "criar")
 *  - Histórico do Lead (timeline)
 *
 * No desktop ≥xl renderizada lateralmente em col-span-4.
 * No mobile vira sequência de cards abaixo do form.
 */
export default function LeadAside({
  conta,
  orcamento,
  history,
  leadId,
  isTerminalSale,
  isCancelado,
  creatingOrcamento,
  onCreateOrcamento,
}) {
  const router = useRouter();
  const canCreateOrcamento = !isTerminalSale && !isCancelado;

  return (
    <aside className="space-y-4">
      {/* Conta vinculada */}
      {conta && (
        <button
          type="button"
          onClick={() => router.push(`/crm/conta-pessoa/${conta.id}`)}
          className="w-full text-left bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-4 hover:border-(--gold)/40 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <UserIcon size={12} className="text-(--gold)" />
            <h3 className="text-xs uppercase tracking-wider text-(--text-muted) font-black">Conta vinculada</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-(--surface-3) border border-(--border-subtle) flex items-center justify-center text-base font-black text-(--text-muted) group-hover:bg-(--gold-soft) group-hover:text-(--gold) group-hover:border-(--gold)/30 transition-all">
              {(conta.nome || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-(--text-primary) text-sm tracking-tight truncate group-hover:text-(--gold-hover) transition-colors">
                {conta.nome} {conta.sobrenome || ''}
              </p>
              <p className="text-xs font-bold text-(--text-muted) truncate">
                {formatPhone(conta.celular)}
              </p>
            </div>
            <ExternalLink size={12} className="text-(--text-muted) group-hover:text-(--gold) transition-colors shrink-0" />
          </div>
        </button>
      )}

      {/* Orçamento vinculado OU CTA pra criar */}
      {orcamento ? (
        <button
          type="button"
          onClick={() => router.push(`/crm/oportunidade-de-negocio/${orcamento.id}`)}
          className="w-full text-left bg-(--surface-2) border border-(--gold)/30 rounded-2xl p-4 hover:border-(--gold) transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={12} className="text-(--gold)" />
            <h3 className="text-xs uppercase tracking-wider text-(--text-muted) font-black">Orçamento</h3>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-black text-(--gold) text-sm tracking-tight truncate group-hover:text-(--gold-hover) transition-colors">
                {orcamento.numero}
              </p>
              <div className="mt-1">
                <OrcamentoStatusBadge status={orcamento.status} size="xs" />
              </div>
            </div>
            <ExternalLink size={12} className="text-(--text-muted) group-hover:text-(--gold) transition-colors shrink-0" />
          </div>
        </button>
      ) : canCreateOrcamento ? (
        <button
          type="button"
          onClick={onCreateOrcamento}
          disabled={creatingOrcamento}
          className="w-full text-left bg-(--surface-2) border border-dashed border-(--border) rounded-2xl p-4 hover:border-(--gold) hover:bg-(--gold-soft)/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={12} className="text-(--text-muted) group-hover:text-(--gold) transition-colors" />
            <h3 className="text-xs uppercase tracking-wider text-(--text-muted) font-black">Orçamento</h3>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-(--text-muted) group-hover:text-(--gold) transition-colors">
              {creatingOrcamento ? 'Criando...' : 'Nenhum vinculado'}
            </p>
            {creatingOrcamento ? (
              <Loader2 size={14} className="animate-spin text-(--gold)" />
            ) : (
              <Plus size={14} className="text-(--text-muted) group-hover:text-(--gold) transition-colors" />
            )}
          </div>
        </button>
      ) : null}

      {/* Histórico do Lead */}
      <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <History size={12} className="text-(--gold)" />
          <h3 className="text-xs uppercase tracking-wider text-(--text-muted) font-black">Histórico</h3>
        </div>
        <LeadHistoryTimeline
          leadId={leadId}
          initialEvents={history}
        />
      </div>
    </aside>
  );
}
