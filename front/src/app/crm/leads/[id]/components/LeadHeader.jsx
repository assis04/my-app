'use client';

import { ChevronRight, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';
import { formatPhone } from '@/lib/utils';
import LeadStatusDropdown from '@/components/crm/LeadStatusDropdown';
import MoreActionsMenu from './MoreActionsMenu';

/**
 * Header sticky da tela de edição de Lead.
 * Concentra contexto + ações persistentes:
 *  - Breadcrumb hierárquico (CRM › Leads › #X)
 *  - Avatar + nome + telefone + CEP
 *  - Status (LeadStatusDropdown — clicável quando há transições)
 *  - Menu "⋯" com ações terciárias/destrutivas
 *
 * Não inclui botão "Salvar" — esse vive na DirtyBar (sticky bottom),
 * só aparece quando há mudanças não salvas.
 */
export default function LeadHeader({
  leadId,
  form,
  leadStatus,
  onStatusTransition,
  busy,
  formDisabled,
  isCancelado,
  onCancelLead,
  onReactivate,
  onDelete,
}) {
  const inicial = (form.nome || '').trim().charAt(0).toUpperCase() || '?';
  const nomeCompleto = `${form.nome || 'Lead sem nome'} ${form.sobrenome || ''}`.trim();

  return (
    <>
      {/* Breadcrumb — não-sticky, fica acima do header */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-(--text-muted) mb-3 font-bold tracking-wider uppercase">
        <Link href="/" className="hover:text-(--text-primary) transition-colors">CRM</Link>
        <ChevronRight size={11} />
        <Link href="/crm/leads" className="hover:text-(--text-primary) transition-colors">Leads</Link>
        <ChevronRight size={11} />
        <span className="text-(--text-primary)">#{String(leadId).padStart(4, '0')}</span>
      </nav>

      {/* Header sticky — contexto persistente em scroll longo */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-(--bg-base)/95 backdrop-blur-md border-b border-(--border-subtle) mb-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 shrink-0 rounded-2xl bg-(--gold) text-(--on-gold) flex items-center justify-center font-black text-lg shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)]"
            aria-hidden="true"
          >
            {inicial}
          </div>

          {/* Nome + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-black text-(--text-primary) tracking-tight truncate">
              {nomeCompleto}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 text-xs font-bold text-(--text-muted) flex-wrap">
              {form.celular && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={11} className="text-(--gold)" />
                  {formatPhone(form.celular)}
                </span>
              )}
              {form.cep && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} className="text-(--gold)" />
                  {form.cep}
                </span>
              )}
            </div>
          </div>

          {/* Status (compacto, à direita) */}
          <div className="shrink-0 hidden md:block">
            <LeadStatusDropdown
              status={leadStatus}
              onTransition={onStatusTransition}
              submitting={busy}
              disabled={formDisabled}
            />
          </div>

          {/* Mais ações */}
          <div className="shrink-0">
            <MoreActionsMenu
              isCancelado={isCancelado}
              formDisabled={formDisabled}
              busy={busy}
              onCancelLead={onCancelLead}
              onReactivate={onReactivate}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Status no mobile (abaixo, full width) */}
        <div className="mt-3 md:hidden">
          <LeadStatusDropdown
            status={leadStatus}
            onTransition={onStatusTransition}
            submitting={busy}
            disabled={formDisabled}
          />
        </div>
      </div>
    </>
  );
}
