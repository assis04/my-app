'use client';

import { History as HistoryIcon } from 'lucide-react';
import LeadHistoryTimeline from '@/components/crm/LeadHistoryTimeline';

/**
 * Seção de histórico do Lead — timeline full-width na base da página.
 *
 * Encapsula o LeadHistoryTimeline (que cuida da pagination cursor-based)
 * num container Workshop com eyebrow mono e padding generoso pra leitura.
 *
 * Hierarquia visual baixa propositalmente: contexto de consulta, não de ação.
 */
export default function LeadHistorySection({ leadId, history }) {
  return (
    <section className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-5">
      <header className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon size={12} className="text-(--gold)" />
          <h2 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
            Histórico de atividades
          </h2>
        </div>
        {history?.length > 0 && (
          <span className="font-mono text-[11px] text-(--text-faint) tabular-nums">
            {history.length} {history.length === 1 ? 'evento' : 'eventos'}
          </span>
        )}
      </header>

      <LeadHistoryTimeline leadId={leadId} initialEvents={history} />
    </section>
  );
}
