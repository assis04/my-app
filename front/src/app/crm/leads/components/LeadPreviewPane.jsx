'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Loader2, AlertTriangle, ExternalLink, Phone, Copy, Check,
  Pencil, Briefcase, User as UserIcon, History as HistoryIcon,
} from 'lucide-react';
import { api } from '@/services/api';
import { formatPhone } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/leadStatus';
import StatusBar from '@/components/crm/StatusBar';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';

/**
 * Painel lateral de detalhe do Lead — modo leitura + ações.
 *
 * Identidade Workshop:
 *  - Nome UPPERCASE em destaque, ID em mono pequeno embaixo
 *  - Eyebrows (labels mono uppercase) em cada seção
 *  - Dados numéricos (telefone, CEP, data) em font-mono
 *  - StatusBar (barra vertical) em vez de pill
 *  - Sem glass-card overuse
 *
 * Edição completa dos campos do form continua na página dedicada
 * (/crm/leads/[id]) — este pane é leitura+ações rápidas.
 *
 * Props:
 *  - leadId: number | string
 *  - onClose: () => void
 *  - onCopyPhone: optional toast trigger
 */
export default function LeadPreviewPane({ leadId, onClose }) {
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLead(null);

    Promise.all([
      api(`/api/crm/leads/${leadId}`),
      api(`/api/crm/leads/${leadId}/orcamento`).catch(() => null),
    ])
      .then(([leadData, orcamento]) => {
        if (cancelled) return;
        setLead({ ...leadData, orcamento });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Erro ao carregar lead.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [leadId]);

  const handleCopy = async () => {
    if (!lead?.celular) return;
    try {
      await navigator.clipboard.writeText(formatPhone(lead.celular));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silencioso em http */ }
  };

  if (!leadId) return null;

  return (
    <aside className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header sticky */}
      <header className="flex items-center justify-between gap-2 px-5 py-4 border-b border-(--border-subtle) sticky top-0 bg-(--surface-2) z-10">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono">
          Preview
        </span>
        <button
          onClick={onClose}
          className="p-1.5 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-3) rounded-lg transition-colors"
          aria-label="Fechar preview"
        >
          <X size={14} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <span className="block bg-(--surface-3) animate-pulse rounded h-3 w-16" />
              <span className="block bg-(--surface-3) animate-pulse rounded h-7 w-48" />
              <span className="block bg-(--surface-3) animate-pulse rounded h-3 w-12" />
            </div>
            <div className="space-y-2">
              <span className="block bg-(--surface-3) animate-pulse rounded h-3 w-full" />
              <span className="block bg-(--surface-3) animate-pulse rounded h-3 w-3/4" />
              <span className="block bg-(--surface-3) animate-pulse rounded h-3 w-2/3" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-5">
            <div className="flex items-start gap-2 text-(--danger) text-sm">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {lead && !loading && (
          <div className="p-5 space-y-6">
            {/* Identidade */}
            <section>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono mb-1.5">
                #{String(lead.id).padStart(4, '0')}
              </span>
              <h2 className="text-xl font-semibold text-(--text-primary) tracking-[-0.02em] uppercase leading-tight">
                {lead.nome} {lead.sobrenome || ''}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <StatusBar palette={STATUS_COLORS[lead.status]} label={lead.status} />
                {lead.etapa && (
                  <span className="text-xs text-(--text-muted) font-medium">{lead.etapa}</span>
                )}
              </div>
            </section>

            {/* Contato */}
            <section className="space-y-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono">
                Contato
              </span>
              {lead.celular && (
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`tel:${lead.celular.replace(/\D/g, '')}`}
                    className="font-mono text-sm text-(--text-primary) tabular-nums hover:text-(--gold) transition-colors"
                  >
                    {formatPhone(lead.celular)}
                  </a>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-lg transition-colors"
                    title={copied ? 'Copiado!' : 'Copiar telefone'}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              )}
              {lead.email && (
                <p className="text-sm text-(--text-secondary) truncate" title={lead.email}>
                  {lead.email}
                </p>
              )}
              {lead.cep && (
                <p className="font-mono text-xs text-(--text-muted) tabular-nums">
                  CEP {lead.cep}
                </p>
              )}
            </section>

            {/* Conta vinculada */}
            {lead.conta && (
              <section>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono mb-2">
                  Conta
                </span>
                <button
                  type="button"
                  onClick={() => router.push(`/crm/conta-pessoa/${lead.conta.id}`)}
                  className="w-full text-left bg-(--surface-1) border border-(--border-subtle) rounded-lg p-3 hover:border-(--gold)/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 shrink-0 rounded-lg bg-(--surface-3) flex items-center justify-center text-xs font-semibold text-(--text-muted) group-hover:bg-(--gold-soft) group-hover:text-(--gold) transition-colors">
                        {(lead.conta.nome || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-(--text-primary) uppercase tracking-[-0.01em] truncate">
                        {lead.conta.nome}
                      </span>
                    </div>
                    <ExternalLink size={12} className="text-(--text-faint) group-hover:text-(--gold) shrink-0 transition-colors" />
                  </div>
                </button>
              </section>
            )}

            {/* Orçamento */}
            {lead.orcamento && (
              <section>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono mb-2">
                  Orçamento
                </span>
                <button
                  type="button"
                  onClick={() => router.push(`/crm/oportunidade-de-negocio/${lead.orcamento.id}`)}
                  className="w-full text-left bg-(--surface-1) border border-(--gold)/30 rounded-lg p-3 hover:border-(--gold) transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-(--gold) tabular-nums truncate">
                        {lead.orcamento.numero}
                      </p>
                      <div className="mt-1.5">
                        <OrcamentoStatusBadge status={lead.orcamento.status} size="xs" />
                      </div>
                    </div>
                    <ExternalLink size={12} className="text-(--text-faint) group-hover:text-(--gold) shrink-0 transition-colors" />
                  </div>
                </button>
              </section>
            )}

            {/* Atribuição */}
            <section className="space-y-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono">
                Atribuição
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-(--text-muted) uppercase tracking-wider font-mono">Pré-vendedor</span>
                <span className="text-sm text-(--text-secondary) truncate">
                  {lead.preVendedor?.nome || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-(--text-muted) uppercase tracking-wider font-mono">Origem</span>
                <span className="text-sm text-(--text-secondary)">
                  {lead.origemExterna ? 'Externo' : (lead.origemCanal || 'Manual')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-(--text-muted) uppercase tracking-wider font-mono">Criado</span>
                <span className="font-mono text-xs text-(--text-secondary) tabular-nums">
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </section>

            {/* Histórico recente */}
            {lead.history && lead.history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-(--text-faint) font-mono">
                    Últimos eventos
                  </span>
                  <span className="font-mono text-[11px] text-(--text-faint) tabular-nums">
                    {lead.history.length}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {lead.history.slice(0, 5).map((ev) => (
                    <li key={ev.id} className="flex items-baseline gap-2 text-xs">
                      <span className="h-1 w-1 rounded-full bg-(--text-faint) shrink-0 mt-1.5" aria-hidden />
                      <span className="text-(--text-secondary) flex-1 truncate">
                        {humanizeEvent(ev)}
                      </span>
                      <span className="font-mono text-(--text-faint) tabular-nums shrink-0">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Footer com ação primária — sempre visível */}
      {lead && !loading && (
        <footer className="px-5 py-3 border-t border-(--border-subtle) bg-(--surface-2)">
          <button
            onClick={() => router.push(`/crm/leads/${lead.id}`)}
            className="w-full flex items-center justify-center gap-2 bg-(--gold) text-(--on-gold) h-9 rounded-lg font-semibold text-sm tracking-tight transition-transform active:scale-[0.98]"
            style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
          >
            <Pencil size={13} /> Editar lead
          </button>
        </footer>
      )}
    </aside>
  );
}

// ─── Helper: humaniza events do LeadHistory ──────────────────────────────
function humanizeEvent(ev) {
  const labels = {
    status_changed: 'Status alterado',
    temperatura_changed: 'Temperatura alterada',
    lead_cancelled: 'Lead cancelado',
    lead_reactivated: 'Lead reativado',
    agenda_scheduled: 'Compromisso agendado',
    vendedor_transferred: 'Transferido',
    note_added: 'Anotação',
    external_created: 'Criado via integração',
  };
  return labels[ev.eventType] || ev.eventType;
}
