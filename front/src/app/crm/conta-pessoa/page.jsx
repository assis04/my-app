'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getAccounts } from '@/services/crmApi';
import { useDebounce } from '@/hooks/useDebounce';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { STATUS_ORDER } from '@/lib/leadStatus';

function LeadsList({ leads }) {
  if (!leads || leads.length === 0) {
    return <span className="text-xs text-slate-300 font-bold italic">Nenhum lead</span>;
  }
  return (
    <div className="flex flex-col gap-1 py-1">
      {leads.map(lead => (
        <div key={lead.id} className="flex items-center gap-2 text-xs">
          <span className="text-slate-300 font-black italic">#{String(lead.id).padStart(4, '0')}</span>
          <span className="text-slate-700 font-bold truncate max-w-[120px]">{lead.nome}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-black border shadow-xs tracking-tight ${
            lead.status === 'Cancelado'
              ? 'bg-rose-50 border-rose-100 text-rose-600'
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>{lead.status}</span>
          <span className="text-xs font-black text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-lg border border-sky-100 tracking-tight">{lead.etapa}</span>
        </div>
      ))}
    </div>
  );
}

export default function ContaPessoaPage() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
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
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-slate-200 pb-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Conta / Pessoa</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">Contas criadas automaticamente pelo fluxo de Leads</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchAccounts(pagination.page)}
            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
            title="Sincronizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6 relative border border-white/60 shadow-floating bg-white/40 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Nome do cliente"
              value={filters.nome}
              onChange={e => handleFilterChange('nome', e.target.value)}
              className="premium-input py-2 pl-10 text-base shadow-xs font-bold"
            />
          </div>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={14} />
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
        <div className="text-zinc-500 text-sm font-black bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200 tracking-tight shadow-xs italic">
          {!loading && (
            <span>{pagination.total} conta{pagination.total !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-floating overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
            <thead className="bg-slate-50/50 text-slate-400 font-black text-xs tracking-tight italic border-b border-slate-100">
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
            <tbody className="divide-y divide-slate-50">
              {loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 font-black text-sm animate-pulse mt-3">Sincronizando base...</p>
                  </td>
                </tr>
              )}
              {!loading && accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-100 text-slate-200">
                      <Users size={20} />
                    </div>
                    <p className="text-slate-300 font-black text-xs">Nenhuma conta encontrada.</p>
                    <p className="text-slate-200 text-xs font-bold mt-1">Limpe os filtros ou crie um Lead com Nome + Celular + CEP.</p>
                  </td>
                </tr>
              )}
              {accounts.map(acc => (
                <React.Fragment key={acc.id}>
                  <tr className="hover:bg-sky-50/40 transition-all group cursor-pointer" onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}>
                    <td className="py-1.5 px-4 text-slate-300 text-center text-xs font-black group-hover:text-sky-500 italic transition-colors">#{String(acc.id).padStart(4, '0')}</td>
                    <td className="py-1.5 px-3">
                      <span className="text-slate-900 text-sm font-black group-hover:text-sky-700 transition-colors tracking-tight">{acc.nome}</span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-600 text-sm font-bold tracking-tight">{acc.sobrenome}</td>
                    <td className="py-1.5 px-3 text-slate-500 text-xs font-bold">{acc.celular}</td>
                    <td className="py-1.5 px-3 text-slate-500 text-xs font-bold">{acc.cep}</td>
                    <td className="py-1.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center bg-sky-50 text-sky-600 text-xs font-black border border-sky-100 px-2 py-0.5 rounded-full min-w-[24px]">
                        {acc._count?.leads ?? 0}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-400 text-xs font-black tracking-tight italic">
                      {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-1.5 px-4 text-center">
                      {expandedId === acc.id
                        ? <ChevronUp size={14} className="text-sky-500 mx-auto" />
                        : <ChevronDown size={14} className="text-slate-300 group-hover:text-sky-400 mx-auto transition-colors" />
                      }
                    </td>
                  </tr>
                  {expandedId === acc.id && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50/50 px-6 py-3 border-b border-slate-100">
                        <div className="text-xs font-black text-slate-400 tracking-tight mb-1.5">Leads vinculados a esta conta:</div>
                        <LeadsList leads={acc.leads} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-black tracking-tight italic">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchAccounts(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-500 border border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
              >
                Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAccounts(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-500 border border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all disabled:opacity-30 disabled:pointer-events-none tracking-tight"
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
