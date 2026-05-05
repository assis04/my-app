'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getAccounts } from '@/services/crmApi';
import { useDebounce } from '@/hooks/useDebounce';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { STATUS_ORDER } from '@/lib/leadStatus';

export default function ContaPessoaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  // Mesma estrutura de filtros que /crm/oportunidade-de-negocio
  const [filters, setFilters] = useState({
    nome: '',
    telefone: '',
    status: '',
    filialId: '',
    userId: '',
    data: '',
  });

  // Debounce só nos campos de texto pra não estourar request por tecla
  const debouncedNome = useDebounce(filters.nome);
  const debouncedTelefone = useDebounce(filters.telefone);

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

  const fetchAccounts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const query = {
        nome: debouncedNome.trim() || undefined,
        telefone: debouncedTelefone.trim() || undefined,
        status: filters.status || undefined,
        filialId: filters.filialId || undefined,
        userId: filters.userId || undefined,
        page,
        limit: 50,
      };

      // Período → dataInicio (mesma convenção da tela de O.N.)
      if (filters.data === 'Hoje') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        query.dataInicio = start.toISOString();
      } else if (filters.data === '7d') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        query.dataInicio = start.toISOString();
      } else if (filters.data === '30d') {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        query.dataInicio = start.toISOString();
      }

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
  }, [debouncedNome, debouncedTelefone, filters.status, filters.filialId, filters.userId, filters.data]);

  useEffect(() => {
    if (!authLoading && user) fetchAccounts(1);
  }, [authLoading, user, fetchAccounts]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const next = { ...prev, [field]: value };
      // Mudou filial → limpa responsável (que era filtrado pela filial anterior)
      if (field === 'filialId') next.userId = '';
      return next;
    });
  };

  // Responsável fica filtrado pela filial selecionada (UX consistente com /crm/oportunidade-de-negocio)
  const filteredUsers = filters.filialId
    ? users.filter(u => u.filialId === Number(filters.filialId))
    : users;

  if (authLoading) return null;

  return (
    <div className="mb-4 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-(--border) pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-(--text-primary) tracking-tight">Conta / Pessoa</h1>
          <p className="text-xs text-(--text-muted) font-bold mt-0.5">Contas criadas automaticamente pelo fluxo de Leads</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchAccounts(pagination.page)}
            className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95"
            title="Sincronizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6 relative border border-white/60 shadow-floating bg-(--surface-2)/40 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) font-black group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Nome do cliente"
              value={filters.nome}
              onChange={e => handleFilterChange('nome', e.target.value)}
              className="premium-input py-2 pl-10 text-base shadow-xs font-bold"
            />
          </div>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) font-black group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Telefone"
              value={filters.telefone}
              onChange={e => handleFilterChange('telefone', e.target.value)}
              className="premium-input py-2 pl-10 text-base shadow-xs font-bold"
            />
          </div>

          <PremiumSelect
            placeholder="Status do lead (Todos)"
            options={STATUS_ORDER.map(s => ({ id: s, nome: s }))}
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
          />

          <PremiumSelect
            placeholder="Filial (Todas)"
            options={branches}
            value={filters.filialId}
            onChange={e => handleFilterChange('filialId', e.target.value)}
          />

          <PremiumSelect
            placeholder="Responsável (Todos)"
            options={filteredUsers}
            value={filters.userId}
            onChange={e => handleFilterChange('userId', e.target.value)}
          />

          <PremiumSelect
            placeholder="Data (Qualquer)"
            options={[
              { id: 'Hoje', nome: 'Hoje' },
              { id: '7d', nome: 'Últimos 7 dias' },
              { id: '30d', nome: 'Últimos 30 dias' },
            ]}
            value={filters.data}
            onChange={e => handleFilterChange('data', e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="text-(--text-muted) text-sm font-black bg-(--surface-3)/50 px-3 py-1 rounded-full border border-(--border) tracking-tight shadow-xs italic">
          {!loading && (
            <span>{pagination.total} conta{pagination.total !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="w-full bg-(--surface-2) border border-(--border-subtle) rounded-2xl shadow-floating overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
            <thead className="bg-(--surface-1)/50 text-(--text-muted) font-black text-xs tracking-tight italic border-b border-(--border-subtle)">
              <tr>
                <th scope="col" className="py-2 px-4 text-center w-[50px]">ID</th>
                <th scope="col" className="py-2 px-3">Nome</th>
                <th scope="col" className="py-2 px-3">Sobrenome</th>
                <th scope="col" className="py-2 px-3">Celular</th>
                <th scope="col" className="py-2 px-3">CEP</th>
                <th scope="col" className="py-2 px-3 text-center">Leads</th>
                <th scope="col" className="py-2 px-3">Criado em</th>
                <th scope="col" className="py-2 px-4 text-center w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-10 h-10 border-4 border-(--gold-soft) border-t-sky-500 rounded-full animate-spin mx-auto" />
                    <p className="text-(--text-muted) font-black text-sm animate-pulse mt-3">Sincronizando base...</p>
                  </td>
                </tr>
              )}
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-2 border border-(--border-subtle) text-(--text-faint)">
                      <Users size={20} />
                    </div>
                    <p className="text-(--text-muted) font-black text-xs">Nenhuma conta encontrada.</p>
                    <p className="text-(--text-faint) text-xs font-bold mt-1">Limpe os filtros ou crie um Lead com Nome + Celular + CEP.</p>
                  </td>
                </tr>
              )}
              {accounts.map(acc => (
                <tr
                  key={acc.id}
                  className="hover:bg-(--gold-soft)/40 transition-all group cursor-pointer"
                  onClick={() => router.push(`/crm/conta-pessoa/${acc.id}`)}
                >
                  <td className="py-1.5 px-4 text-(--text-muted) text-center text-xs font-black group-hover:text-(--gold) italic transition-colors">#{String(acc.id).padStart(4, '0')}</td>
                  <td className="py-1.5 px-3">
                    <span className="text-(--text-primary) text-sm font-black group-hover:text-(--gold-hover) transition-colors tracking-tight">{acc.nome}</span>
                  </td>
                  <td className="py-1.5 px-3 text-(--text-secondary) text-sm font-bold tracking-tight">{acc.sobrenome}</td>
                  <td className="py-1.5 px-3 text-(--text-secondary) text-xs font-bold">{acc.celular}</td>
                  <td className="py-1.5 px-3 text-(--text-secondary) text-xs font-bold">{acc.cep}</td>
                  <td className="py-1.5 px-3 text-center">
                    <span className="inline-flex items-center justify-center bg-(--gold-soft) text-(--gold) text-xs font-black border border-(--gold-soft) px-2 py-0.5 rounded-full min-w-[24px]">
                      {acc._count?.leads ?? 0}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-(--text-muted) text-xs font-black tracking-tight italic">
                    {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-1.5 px-4 text-center">
                    <ChevronRight size={14} className="text-(--text-muted) group-hover:text-(--gold) mx-auto transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-subtle)">
            <span className="text-xs text-(--text-muted) font-black tracking-tight italic">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchAccounts(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
              >
                Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAccounts(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
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
