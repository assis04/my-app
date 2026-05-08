'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, RefreshCw, Users } from 'lucide-react';
import PremiumSelect from '@/components/ui/PremiumSelect';
import PeriodoFilter, { buildPeriodoQuery } from '@/components/crm/PeriodoFilter';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';
import { getOrcamentos } from '@/services/crmApi';
import { STATUS_ORDER, STATUS_COLORS } from '@/lib/orcamentoStatus';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Listagem de Orçamentos (N.O.N.) — refatorada com padrão "Leads world-class":
 *  - URL params como source of truth (refresh-safe, shareable)
 *  - StatusTabs no topo (chips segmented, substitui dropdown de Status)
 *  - PeriodoFilter (chips + custom range com data inicial/final)
 *  - Skeleton estrutural matching layout
 *  - EmptyState contextual (com filtros vs vazio)
 *
 * Criação acontece exclusivamente via "Nova Oportunidade" no detalhe do Lead.
 * Specs: specs/crm-non.md
 */

// ─── StatusInline: dot + texto colorido (formato minimal, sem pill) ───────
function StatusInline({ status }) {
  const palette = STATUS_COLORS[status];
  if (!palette) {
    return <span className="text-sm text-(--text-muted)">{status || '—'}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${palette.dot}`} aria-hidden />
      <span className={`${palette.text} truncate`}>{status}</span>
    </span>
  );
}

// ─── StatusTabs: chips segmented pra navegação primária ───────────────────
function StatusTabs({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Filtrar por status" className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      <StatusChip active={!value} onClick={() => onChange('')}>Todos</StatusChip>
      {STATUS_ORDER.map((s) => (
        <StatusChip key={s} active={value === s} dot={STATUS_COLORS[s]?.dot} onClick={() => onChange(s)}>
          {s}
        </StatusChip>
      ))}
    </div>
  );
}

function StatusChip({ active, dot, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 h-8 px-3 rounded-full whitespace-nowrap
        text-sm font-medium tracking-tight transition-all shrink-0
        ${active
          ? 'bg-(--surface-3) text-(--text-primary) border border-(--border) shadow-xs'
          : 'text-(--text-muted) border border-transparent hover:text-(--text-primary) hover:bg-(--surface-2)'}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />}
      {children}
    </button>
  );
}

// ─── Skeletons + EmptyState ──────────────────────────────────────────────
function OrcamentosSkeleton({ rows = 6 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={`orc-skel-${i}`} className="border-b border-(--border-subtle)/50">
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-32" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-28" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-24" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-16" /></td>
      <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded-full h-4 w-20" /></td>
    </tr>
  ));
}

function EmptyState({ hasFilters, onClear }) {
  if (hasFilters) {
    return (
      <tr><td colSpan={7} className="py-14 text-center">
        <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
          <Search size={18} />
        </div>
        <p className="text-(--text-muted) text-sm font-medium mb-1">Nenhum orçamento corresponde aos filtros</p>
        <button onClick={onClear} className="text-sm text-(--gold) hover:text-(--gold-hover) font-medium underline-offset-4 hover:underline">
          Limpar filtros
        </button>
      </td></tr>
    );
  }
  return (
    <tr><td colSpan={7} className="py-14 text-center">
      <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
        <Users size={18} />
      </div>
      <p className="text-(--text-muted) text-sm font-medium">Nenhum orçamento cadastrado ainda.</p>
      <p className="text-xs text-(--text-faint) mt-1">
        Vá em /crm/leads e clique em &quot;Nova Oportunidade&quot; em um Lead para criar o primeiro.
      </p>
    </td></tr>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────
export default function OportunidadeDeNegocioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useAuth(); // garante sessão autenticada

  // URL é source of truth pros filtros.
  const urlNome = searchParams.get('nome') || '';
  const urlTelefone = searchParams.get('telefone') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlFilialId = searchParams.get('filialId') || '';
  const urlUserId = searchParams.get('userId') || '';
  const urlPeriodoModo = searchParams.get('periodo') || '';
  const urlDataInicio = searchParams.get('dataInicio') || '';
  const urlDataFim = searchParams.get('dataFim') || '';

  const periodoValue = { modo: urlPeriodoModo, dataInicio: urlDataInicio, dataFim: urlDataFim };
  const hasFilters = Boolean(urlNome || urlTelefone || urlStatus || urlFilialId || urlUserId || urlPeriodoModo);

  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  // Inputs de texto: state local + debounce → URL.
  const [nome, setNome] = useState(urlNome);
  const [telefone, setTelefone] = useState(urlTelefone);
  const debouncedNome = useDebounce(nome);
  const debouncedTelefone = useDebounce(telefone);

  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v == null) params.delete(k);
      else params.set(k, String(v));
    });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Inputs debounced → URL.
  useEffect(() => {
    if (debouncedNome === urlNome) return;
    updateParams({ nome: debouncedNome || undefined });
  }, [debouncedNome, urlNome, updateParams]);

  useEffect(() => {
    if (debouncedTelefone === urlTelefone) return;
    updateParams({ telefone: debouncedTelefone || undefined });
  }, [debouncedTelefone, urlTelefone, updateParams]);

  // URL → inputs (cobre back/forward + clear filters).
  useEffect(() => { setNome(urlNome); }, [urlNome]);
  useEffect(() => { setTelefone(urlTelefone); }, [urlTelefone]);

  // Lookups (filiais + vendedores) — uma vez.
  useEffect(() => {
    async function loadSelectData() {
      try {
        const [resBranches, resUsers] = await Promise.all([
          api('/filiais'),
          api('/users/lookup?role=Vendedor'),
        ]);
        const list = resBranches?.data ?? (Array.isArray(resBranches) ? resBranches : []);
        setBranches(list);
        const usersList = Array.isArray(resUsers) ? resUsers : (resUsers?.data ?? []);
        setUsers(usersList);
      } catch (err) {
        console.error('Erro ao carregar filtros:', err);
      }
    }
    loadSelectData();
  }, []);

  const fetchOrcamentos = useCallback(async () => {
    try {
      setLoading(true);
      const periodoQuery = buildPeriodoQuery(periodoValue) || {};
      const query = {
        nome: urlNome || undefined,
        telefone: urlTelefone || undefined,
        status: urlStatus || undefined,
        filialId: urlFilialId || undefined,
        userId: urlUserId || undefined,
        ...periodoQuery,
      };

      const result = await getOrcamentos(query);
      setOrcamentos(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error('Erro ao buscar orçamentos:', err);
      setOrcamentos([]);
    } finally {
      setLoading(false);
    }
    // periodoValue é objeto; dependo dos primitivos pra não recriar useCallback.
  }, [urlNome, urlTelefone, urlStatus, urlFilialId, urlUserId, urlPeriodoModo, urlDataInicio, urlDataFim]);

  useEffect(() => { fetchOrcamentos(); }, [fetchOrcamentos]);

  const handleStatusChange = (status) => updateParams({ status: status || undefined });
  const handleFilialChange = (e) => updateParams({ filialId: e.target.value || undefined, userId: undefined });
  const handleUserChange = (e) => updateParams({ userId: e.target.value || undefined });
  const handlePeriodoChange = (next) => {
    updateParams({
      periodo: next.modo || undefined,
      dataInicio: next.modo === 'custom' ? (next.dataInicio || undefined) : undefined,
      dataFim: next.modo === 'custom' ? (next.dataFim || undefined) : undefined,
    });
  };
  const handleClearFilters = () => {
    setNome('');
    setTelefone('');
    updateParams({
      nome: undefined, telefone: undefined, status: undefined,
      filialId: undefined, userId: undefined, periodo: undefined,
      dataInicio: undefined, dataFim: undefined,
    });
  };

  const filteredUsers = urlFilialId
    ? users.filter((u) => u.filialId === Number(urlFilialId))
    : users;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-(--border-subtle) pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-(--text-primary) tracking-tight">Oportunidade de Negócio</h1>
          <p className="text-sm text-(--text-muted) mt-0.5">
            Para criar: abra um Lead e clique em &quot;Nova Oportunidade&quot;.
          </p>
        </div>
        <button
          onClick={fetchOrcamentos}
          className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95"
          title="Sincronizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        {/* Status Tabs — navegação primária */}
        <div className="mb-4 pb-3 border-b border-(--border-subtle)">
          <StatusTabs value={urlStatus} onChange={handleStatusChange} />
        </div>

        {/* Período */}
        <div className="mb-4 pb-3 border-b border-(--border-subtle)">
          <PeriodoFilter value={periodoValue} onChange={handlePeriodoChange} />
        </div>

        {/* Demais filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Nome do cliente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="premium-input py-2 pl-10 text-sm shadow-xs font-medium"
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="premium-input py-2 pl-10 text-sm shadow-xs font-medium"
            />
          </div>
          <PremiumSelect
            placeholder="Filial (Todas)"
            options={branches}
            value={urlFilialId}
            onChange={handleFilialChange}
          />
          <PremiumSelect
            placeholder="Responsável (Todos)"
            options={filteredUsers}
            value={urlUserId}
            onChange={handleUserChange}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="text-(--text-muted) text-sm bg-(--surface-3)/50 px-3 py-1 rounded-full border border-(--border) tabular-nums shadow-xs">
          {!loading && <span>{orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Tabela */}
      <div className="w-full bg-(--surface-2) border border-(--border-subtle) rounded-2xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
            <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
              <tr>
                <th className="py-2.5 px-3 w-[120px]">Número</th>
                <th className="py-2.5 px-3">Lead</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Filial</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading && orcamentos.length === 0 && <OrcamentosSkeleton rows={6} />}
              {!loading && orcamentos.length === 0 && (
                <EmptyState hasFilters={hasFilters} onClear={handleClearFilters} />
              )}
              {orcamentos.map((orc) => {
                const lead = orc.lead || {};
                return (
                  <tr
                    key={orc.id}
                    onClick={() => router.push(`/crm/oportunidade-de-negocio/${orc.id}`)}
                    className="hover:bg-(--surface-1)/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-2 px-3">
                      <span className="font-mono tabular-nums text-(--gold) text-sm font-semibold" title={orc.numero}>
                        {orc.numero}
                      </span>
                    </td>
                    <td className="py-2 px-3 max-w-[220px]">
                      <span className="text-(--text-primary) text-sm font-semibold tracking-tight truncate group-hover:text-(--gold-hover) transition-colors" title={lead.nome}>
                        {lead.nome || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-(--text-secondary) text-sm font-medium tabular-nums">
                      {lead.celular || '—'}
                    </td>
                    <td className="py-2 px-3 text-(--text-muted) text-sm" title={lead.vendedor?.nome}>
                      {lead.vendedor?.nome || '—'}
                    </td>
                    <td className="py-2 px-3 text-(--text-secondary) text-sm" title={lead.filial?.nome}>
                      {lead.filial?.nome || '—'}
                    </td>
                    <td className="py-2 px-3 text-(--text-muted) text-sm tabular-nums">
                      {orc.createdAt ? new Date(orc.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <StatusInline status={orc.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
