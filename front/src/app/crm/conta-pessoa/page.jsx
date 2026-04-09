'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAccounts } from '@/services/crmApi';
import { useDebounce } from '@/hooks/useDebounce';

function LeadsList({ leads }) {
  if (!leads || leads.length === 0) {
    return <span className="text-[9px] text-slate-300 font-bold italic">Nenhum lead</span>;
  }
  return (
    <div className="flex flex-col gap-1 py-1">
      {leads.map(lead => (
        <div key={lead.id} className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-300 font-black italic">#{String(lead.id).padStart(4, '0')}</span>
          <span className="text-slate-700 font-bold truncate max-w-[120px]">{lead.nome}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border shadow-xs uppercase tracking-tighter ${
            lead.status === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
          }`}>{lead.status}</span>
          <span className="text-[8px] font-black text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-lg border border-sky-100 uppercase tracking-tighter">{lead.etapa}</span>
        </div>
      ))}
    </div>
  );
}

export default function ContaPessoaPage() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const debouncedSearch = useDebounce(searchTerm);

  const fetchAccounts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getAccounts({
        search: debouncedSearch.trim() || undefined,
        page,
        limit: 50,
      });
      setAccounts(result.data);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (!authLoading && user) fetchAccounts();
  }, [authLoading, user, fetchAccounts]);

  if (authLoading) return null;

  return (
    <div className="mb-4 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter italic">Conta / Pessoa</h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 italic">Contas criadas automaticamente pelo fluxo de Leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAccounts} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" title="Atualizar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="glass-card border border-white/60 rounded-3xl p-4 shadow-floating mb-2 bg-white/40 backdrop-blur-xl">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-2">
          <div className="relative group min-w-[320px]">
            <input
              type="text"
              placeholder="Buscar por nome, sobrenome, celular, CEP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white text-xs text-slate-900 pl-9 pr-4 h-9 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 outline-none transition-all placeholder:text-slate-300 font-bold shadow-xs uppercase tracking-tighter"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter italic">
            {pagination.total} conta{pagination.total !== 1 ? 's' : ''} encontrada{pagination.total !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap text-slate-600 border-collapse">
              <thead className="bg-slate-50/50 text-slate-400 font-black text-[9px] uppercase tracking-tighter italic border-b border-slate-100">
                <tr>
                  <th className="py-2 px-4 text-center w-[50px]">ID</th>
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3">Sobrenome</th>
                  <th className="py-2 px-3">Celular</th>
                  <th className="py-2 px-3">CEP</th>
                  <th className="py-2 px-3 text-center">Leads</th>
                  <th className="py-2 px-3">Criado em</th>
                  <th className="py-2 px-4 text-center w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <p className="text-slate-300 font-black text-[9px] uppercase animate-pulse">Carregando...</p>
                    </td>
                  </tr>
                )}
                {!loading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-100 text-slate-200">
                        <Users size={20} />
                      </div>
                      <p className="text-slate-300 font-black text-[9px] uppercase">Nenhuma conta encontrada.</p>
                      <p className="text-slate-200 text-[8px] font-bold mt-1">Contas aparecem aqui quando um Lead com Nome + Celular + CEP for criado.</p>
                    </td>
                  </tr>
                )}
                {accounts.map(acc => (
                  <React.Fragment key={acc.id}>
                    <tr className="hover:bg-sky-50/40 transition-all group cursor-pointer" onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}>
                      <td className="py-1.5 px-4 text-slate-300 text-center text-[9px] font-black group-hover:text-sky-500 italic transition-colors">#{String(acc.id).padStart(4, '0')}</td>
                      <td className="py-1.5 px-3">
                        <span className="text-slate-900 text-xs font-black group-hover:text-sky-700 transition-colors uppercase tracking-tight">{acc.nome}</span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 text-xs font-bold uppercase tracking-tight">{acc.sobrenome}</td>
                      <td className="py-1.5 px-3 text-slate-500 text-[10px] font-bold">{acc.celular}</td>
                      <td className="py-1.5 px-3 text-slate-500 text-[10px] font-bold">{acc.cep}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center bg-sky-50 text-sky-600 text-[9px] font-black border border-sky-100 px-2 py-0.5 rounded-full min-w-[24px]">
                          {acc._count?.leads ?? 0}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-slate-400 text-[9px] font-black uppercase tracking-tighter italic">
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
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Leads vinculados a esta conta:</div>
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
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter italic">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAccounts(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 border border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all disabled:opacity-30 disabled:pointer-events-none uppercase tracking-tighter"
                >
                  Anterior
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchAccounts(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 border border-slate-200 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all disabled:opacity-30 disabled:pointer-events-none uppercase tracking-tighter"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
