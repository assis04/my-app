'use client';

import { useRouter } from 'next/navigation';
import { User as UserIcon, ExternalLink } from 'lucide-react';
import { formatPhone } from '@/lib/utils';

/**
 * Card de visualização da Conta vinculada ao Lead.
 * Apenas leitura — edição da Conta acontece em /crm/conta-pessoa/[id].
 *
 * Identidade Workshop: eyebrow mono UPPERCASE, nome UPPERCASE,
 * telefone em font-mono, sem glass-card overuse.
 */
export default function LeadContaCard({ conta }) {
  const router = useRouter();

  if (!conta) {
    return (
      <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-5">
        <header className="flex items-center gap-2 mb-3">
          <UserIcon size={12} className="text-(--text-faint)" />
          <h3 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
            Conta / Pessoa
          </h3>
        </header>
        <p className="text-sm text-(--text-muted)">Nenhuma conta vinculada.</p>
      </div>
    );
  }

  return (
    <article className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-5 hover:border-(--gold)/30 transition-colors flex flex-col">
      <header className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <UserIcon size={12} className="text-(--gold)" />
          <h3 className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">
            Conta / Pessoa
          </h3>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/crm/conta-pessoa/${conta.id}`)}
          className="inline-flex items-center gap-1 text-xs font-medium text-(--gold) hover:text-(--gold-hover) transition-colors"
          title="Abrir conta"
        >
          Abrir <ExternalLink size={11} />
        </button>
      </header>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-(--surface-3) border border-(--border-subtle) flex items-center justify-center text-base font-semibold text-(--text-muted)">
          {(conta.nome || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-(--text-primary) text-base tracking-[-0.01em] uppercase truncate">
            {conta.nome} {conta.sobrenome || ''}
          </p>
          <p className="font-mono text-sm text-(--text-secondary) tabular-nums mt-0.5">
            {formatPhone(conta.celular)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {conta.cep && (
          <>
            <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">CEP</dt>
            <dd className="font-mono text-(--text-secondary) tabular-nums text-right">{conta.cep}</dd>
          </>
        )}
        {conta._count?.leads !== undefined && (
          <>
            <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">Leads</dt>
            <dd className="font-mono text-(--text-secondary) tabular-nums text-right">{conta._count.leads}</dd>
          </>
        )}
        {conta.createdAt && (
          <>
            <dt className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono">Criada</dt>
            <dd className="font-mono text-(--text-secondary) tabular-nums text-right">
              {new Date(conta.createdAt).toLocaleDateString('pt-BR')}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
