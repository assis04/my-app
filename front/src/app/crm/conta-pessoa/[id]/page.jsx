'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, AlertTriangle, Phone, MapPin, User as UserIcon,
  Calendar, Briefcase, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhone } from '@/lib/utils';
import { getAccountById } from '@/services/crmApi';
import { friendlyErrorMessage } from '@/lib/apiError';
import { STATUS_COLORS } from '@/lib/leadStatus';

/**
 * Tela de detalhe da Account (Conta/Pessoa).
 *
 * Account é entidade de identificação cruzada (nome+celular+cep). Aqui mostramos
 * os dados da pessoa e a lista completa de Leads vinculados — cada Lead com
 * status, etapa, vendedor responsável e link pro próprio detalhe.
 */
export default function ContaPessoaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id;
  const { user, loading: authLoading } = useAuth();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAccountById(accountId);
      setAccount(data);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (!authLoading && user) fetchAccount();
  }, [user, authLoading, fetchAccount]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-(--gold)" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mt-6">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error || 'Conta não encontrada.'}</p>
        </div>
      </div>
    );
  }

  const totalLeads = account._count?.leads ?? account.leads?.length ?? 0;
  const ativos = (account.leads || []).filter(l => l.status !== 'Cancelado').length;

  return (
    <div className="mb-4 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-(--border) pb-3">
        <button
          onClick={() => router.push('/crm/conta-pessoa')}
          className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-1) rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-1">
            Conta · #{String(account.id).padStart(4, '0')}
          </p>
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight truncate">
            {account.nome} {account.sobrenome || ''}
          </h1>
          <p className="text-sm text-(--text-muted) font-bold mt-0.5">
            Criada em {new Date(account.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm mb-4">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Hero strip — métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-2">
            Total de Leads
          </p>
          <p className="text-4xl font-black text-(--gold) tabular-nums tracking-tight">
            {totalLeads}
          </p>
          <p className="text-sm text-(--text-secondary) font-bold mt-1">
            {ativos} ativo{ativos !== 1 ? 's' : ''} · {totalLeads - ativos} cancelado{(totalLeads - ativos) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-2">
            Identificação Cruzada
          </p>
          <p className="text-sm text-(--text-secondary) font-bold leading-relaxed">
            Esta conta foi criada via fluxo de Lead. Novos Leads com a mesma combinação
            <span className="text-(--text-primary)"> Nome + Celular + CEP</span> são
            atrelados aqui automaticamente.
          </p>
        </div>
      </div>

      {/* Card — Dados pessoais */}
      <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl p-6 mb-6">
        <h3 className="text-(--gold) font-black text-sm tracking-tight flex items-center gap-2 mb-5">
          <UserIcon size={14} className="text-(--gold)" /> Dados Pessoais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-1.5">Nome</p>
            <p className="text-base font-black text-(--text-primary)">{account.nome || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-1.5">Sobrenome</p>
            <p className="text-base font-black text-(--text-primary)">{account.sobrenome || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-1.5 flex items-center gap-1.5">
              <Phone size={11} className="text-(--gold)" /> Celular
            </p>
            <p className="text-base font-black text-(--text-primary) tabular-nums">
              {account.celular ? formatPhone(account.celular) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-(--text-muted) font-bold mb-1.5 flex items-center gap-1.5">
              <MapPin size={11} className="text-(--gold)" /> CEP
            </p>
            <p className="text-base font-black text-(--text-primary) tabular-nums">{account.cep || '—'}</p>
          </div>
        </div>
      </div>

      {/* Card — Leads vinculados */}
      <div className="bg-(--surface-2) border border-(--border-subtle) rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-subtle)">
          <h3 className="text-(--gold) font-black text-sm tracking-tight flex items-center gap-2">
            <Briefcase size={14} className="text-(--gold)" /> Leads Vinculados
            <span className="ml-2 text-xs text-(--text-muted) bg-(--surface-3) px-2 py-0.5 rounded-full border border-(--border-subtle)">
              {totalLeads}
            </span>
          </h3>
        </div>

        {totalLeads === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-(--text-muted) font-bold">
              Nenhum Lead vinculado a esta conta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border-subtle)">
            {account.leads.map(lead => {
              const statusColor = STATUS_COLORS[lead.status] || {
                bg: 'bg-(--surface-3)',
                text: 'text-(--text-muted)',
                border: 'border-(--border-subtle)',
                dot: 'bg-(--text-muted)',
              };
              return (
                <button
                  key={lead.id}
                  onClick={() => router.push(`/crm/leads/${lead.id}`)}
                  className="w-full text-left px-6 py-4 hover:bg-(--surface-3) transition-colors group flex items-center gap-4"
                >
                  <div className="shrink-0">
                    <span className="text-xs text-(--text-muted) font-black italic">
                      #{String(lead.id).padStart(4, '0')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-(--text-primary) group-hover:text-(--gold) transition-colors truncate">
                      {lead.nome}
                    </p>
                    <p className="text-xs text-(--text-muted) font-bold mt-0.5 flex items-center gap-2">
                      <Calendar size={10} />
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                      {lead.preVendedor?.nome && (
                        <>
                          <span>·</span>
                          <span>{lead.preVendedor.nome}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {lead.etapa && (
                      <span className="text-xs font-black text-(--gold) bg-(--gold-soft) px-2 py-0.5 rounded-lg border border-(--gold)/30 tracking-tight">
                        {lead.etapa}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border tracking-tight ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                      {lead.status}
                    </span>
                    <ExternalLink size={14} className="text-(--text-muted) group-hover:text-(--gold) transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
