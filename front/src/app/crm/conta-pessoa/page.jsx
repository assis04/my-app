'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getAccounts } from '@/services/crmApi';
import { useDebounce } from '@/hooks/useDebounce';
import PremiumSelect from '@/components/ui/PremiumSelect';
import PeriodoFilter, { buildPeriodoQuery } from '@/components/crm/PeriodoFilter';
import { STATUS_ORDER } from '@/lib/leadStatus';

export default function ContaPessoaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // URL é source of truth pros filtros (mesmo padrão do redesign de Leads).
  // Refresh-safe, shareable, back/forward funciona naturalmente.
  const urlNome = searchParams.get('nome') || '';
  const urlTelefone = searchParams.get('telefone') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlFilialId = searchParams.get('filialId') || '';
  const urlUserId = searchParams.get('userId') || '';
  const urlPeriodoModo = searchParams.get('periodo') || '';
  const urlDataInicio = searchParams.get('dataInicio') || '';
  const urlDataFim = searchParams.get('dataFim') || '';
  const urlPage = Number(searchParams.get('page') || 1);

  const periodoValue = {
    modo: urlPeriodoModo,
    dataInicio: urlDataInicio,
    dataFim: urlDataFim,
  };

  // Inputs de texto: state local controlado, debounced commit pra URL.
  const [nome, setNome] = useState(urlNome);
  const [telefone, setTelefone] = useState(urlTelefone);
  const debouncedNome = useDebounce(nome);
  const debouncedTelefone = useDebounce(telefone);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  // Helper canônico pra escrever na URL. `replace` evita poluir o history.
  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v == null) params.delete(k);
      else params.set(k, String(v));
    });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Inputs debounced → URL. Reseta página pra 1 ao mudar termo.
  useEffect(() => {
    if (debouncedNome === urlNome) return;
    updateParams({ nome: debouncedNome || undefined, page: undefined });
  }, [debouncedNome, urlNome, updateParams]);

  useEffect(() => {
    if (debouncedTelefone === urlTelefone) return;
    updateParams({ telefone: debouncedTelefone || undefined, page: undefined });
  }, [debouncedTelefone, urlTelefone, updateParams]);

  // URL → inputs: cobre back/forward e "Limpar filtros" externos.
  useEffect(() => { setNome(urlNome); }, [urlNome]);
  useEffect(() => { setTelefone(urlTelefone); }, [urlTelefone]);

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
        console.error('Erro ao carregar filtros de Conta:', err);
      }
    }
    loadSelectData();
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const periodoQuery = buildPeriodoQuery(periodoValue) || {};
      const query = {
        nome: urlNome.trim() || undefined,
        telefone: urlTelefone.trim() || undefined,
        status: urlStatus || undefined,
        filialId: urlFilialId || undefined,
        userId: urlUserId || undefined,
        ...periodoQuery,
        page: urlPage,
        limit: 50,
      };

      const result = await getAccounts(query);
      setAccounts(Array.isArray(result?.data) ? result.data : []);
      setPagination({
        page: result?.page || 1,
        totalPages: result?.totalPages || 1,
        total: result?.total || 0,
      });
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
    // periodoValue depende de 3 string params; listo eles individualmente
    // pra useCallback não depender de objeto que muda a cada render.
  }, [urlNome, urlTelefone, urlStatus, urlFilialId, urlUserId, urlPeriodoModo, urlDataInicio, urlDataFim, urlPage]);

  useEffect(() => {
    if (!authLoading && user) fetchAccounts();
  }, [authLoading, user, fetchAccounts]);

  // Mudou filial → limpa responsável (selecionado anterior pode não pertencer à nova).
  const handleStatusChange = (e) => updateParams({ status: e.target.value || undefined, page: undefined });
  const handleFilialChange = (e) => updateParams({ filialId: e.target.value || undefined, userId: undefined, page: undefined });
  const handleUserChange = (e) => updateParams({ userId: e.target.value || undefined, page: undefined });
  const handlePeriodoChange = (next) => {
    updateParams({
      periodo: next.modo || undefined,
      dataInicio: next.modo === 'custom' ? (next.dataInicio || undefined) : undefined,
      dataFim: next.modo === 'custom' ? (next.dataFim || undefined) : undefined,
      page: undefined,
    });
  };
  const handlePageChange = (page) => updateParams({ page: page > 1 ? page : undefined });

  const filteredUsers = urlFilialId
    ? users.filter(u => u.filialId === Number(urlFilialId))
    : users;

  if (authLoading) return null;

  return (
    <div className="mb-4 max-w-[1600px] mx-auto">
      {/* Header — identidade Workshop: title sans + count mono inline */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-(--border-subtle) pb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-(--text-primary) tracking-[-0.02em] flex items-baseline gap-3 min-w-0">
          Contas
          <span className="font-mono text-base text-(--text-faint) tabular-nums font-normal">
            {pagination.total.toString().padStart(2, '0')}
          </span>
        </h1>
        <button
          onClick={fetchAccounts}
          className="p-2 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-lg transition-colors border border-transparent hover:border-(--gold-soft) active:scale-95"
          title="Sincronizar"
          style={{ transitionTimingFunction: 'var(--ease-spring)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros — sem container glass-card (anti-overuse). Hierarquia via espaçamento. */}
      <div className="mb-6">
        {/* Período (chips + custom range) */}
        <div className="mb-4 pb-3 border-b border-(--border-subtle)">
          <PeriodoFilter value={periodoValue} onChange={handlePeriodoChange} />
        </div>

        {/* Demais filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Nome do cliente"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="premium-input py-2 pl-10 text-sm shadow-xs font-medium"
            />
          </div>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Telefone"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="premium-input py-2 pl-10 text-sm shadow-xs font-medium"
            />
          </div>

          <PremiumSelect
            placeholder="Status do lead (Todos)"
            options={STATUS_ORDER.map(s => ({ id: s, nome: s }))}
            value={urlStatus}
            onChange={handleStatusChange}
          />

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
          {!loading && (
            <span>{pagination.total} conta{pagination.total !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="w-full bg-(--surface-2) border border-(--border-subtle) rounded-2xl shadow-floating overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
            <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
              <tr>
                <th scope="col" className="py-2.5 px-4 text-center w-[50px]">ID</th>
                <th scope="col" className="py-2.5 px-3">Nome</th>
                <th scope="col" className="py-2.5 px-3">Sobrenome</th>
                <th scope="col" className="py-2.5 px-3">Celular</th>
                <th scope="col" className="py-2.5 px-3">CEP</th>
                <th scope="col" className="py-2.5 px-3 text-center">Leads</th>
                <th scope="col" className="py-2.5 px-3">Criado em</th>
                <th scope="col" className="py-2.5 px-4 text-center w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading && accounts.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`acc-skel-${i}`} className="border-b border-(--border-subtle)/50">
                    <td className="py-3 px-4 text-center"><span className="block bg-(--surface-3) animate-pulse rounded h-2.5 w-10 mx-auto" /></td>
                    <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-28" /></td>
                    <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
                    <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-24" /></td>
                    <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-16" /></td>
                    <td className="py-3 px-3 text-center"><span className="block bg-(--surface-3) animate-pulse rounded-full h-5 w-6 mx-auto" /></td>
                    <td className="py-3 px-3"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
                    <td className="py-3 px-4"></td>
                  </tr>
                ))
              )}
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-2 border border-(--border-subtle) text-(--text-faint)">
                      <Users size={20} />
                    </div>
                    <p className="text-(--text-muted) text-sm font-medium">Nenhuma conta encontrada.</p>
                    <p className="text-(--text-faint) text-xs mt-1">Limpe os filtros ou crie um Lead com Nome + Celular + CEP.</p>
                  </td>
                </tr>
              )}
              {accounts.map(acc => (
                <tr
                  key={acc.id}
                  className="hover:bg-(--surface-1)/60 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/crm/conta-pessoa/${acc.id}`)}
                >
                  <td className="py-2.5 px-4 text-(--text-faint) text-center text-xs font-mono tabular-nums group-hover:text-(--gold) transition-colors">#{String(acc.id).padStart(4, '0')}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-(--text-primary) text-sm font-semibold tracking-[-0.01em] uppercase group-hover:text-(--gold-hover) transition-colors">{acc.nome}</span>
                  </td>
                  <td className="py-2.5 px-3 text-(--text-secondary) text-sm font-medium uppercase tracking-[-0.01em]">{acc.sobrenome}</td>
                  <td className="py-2.5 px-3 font-mono text-(--text-secondary) text-sm tabular-nums">{acc.celular}</td>
                  <td className="py-2.5 px-3 font-mono text-(--text-muted) text-xs tabular-nums">{acc.cep}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center justify-center bg-(--gold-soft) text-(--gold) text-xs font-semibold border border-(--gold)/30 px-2 py-0.5 rounded-full min-w-[24px] tabular-nums">
                      {acc._count?.leads ?? 0}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-(--text-muted) text-xs tabular-nums">
                    {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <ChevronRight size={14} className="text-(--text-faint) group-hover:text-(--gold) mx-auto transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-subtle)">
            <span className="text-sm text-(--text-muted) tabular-nums">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
