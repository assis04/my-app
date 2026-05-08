'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, RefreshCw, Users } from 'lucide-react';
import PremiumSelect from '@/components/ui/PremiumSelect';
import OrcamentoStatusBadge from '@/components/crm/OrcamentoStatusBadge';
import { getOrcamentos } from '@/services/crmApi';
import { STATUS_ORDER } from '@/lib/orcamentoStatus';

/**
 * Listagem de Orçamentos (N.O.N.). Consome /api/crm/orcamentos que agora
 * retorna Orçamentos reais (não mais Leads). Cada item tem `lead` aninhado.
 *
 * Criação de Orçamento acontece exclusivamente via botão "Nova Oportunidade"
 * dentro da edição do Lead (/crm/leads/[id]).
 *
 * Specs: specs/crm-non.md
 */
export default function OportunidadeDeNegocioPage() {
  const router = useRouter();
  useAuth(); // garante sessão autenticada

  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    nome: '',
    telefone: '',
    status: '',
    filialId: '',
    userId: '',
    data: '',
  });

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
      const query = { ...filters };

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
      delete query.data;

      const result = await getOrcamentos(query);
      setOrcamentos(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      console.error('Erro ao buscar orçamentos:', err);
      setOrcamentos([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => fetchOrcamentos(), 500);
    return () => clearTimeout(t);
  }, [fetchOrcamentos]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'filialId') next.userId = '';
      return next;
    });
  };

  const filteredUsers = filters.filialId
    ? users.filter((u) => u.filialId === Number(filters.filialId))
    : users;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Filtros — sem glass-card (anti-overuse). Hierarquia via espaçamento. */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) flex items-center gap-2 tracking-tight">
              Oportunidades de Negócio
            </h2>
            <p className="text-sm text-(--text-muted) mt-0.5">
              Para criar: abra um Lead em /crm/leads e clique em &quot;Nova Oportunidade&quot;.
            </p>
          </div>
          <button
            onClick={fetchOrcamentos}
            className="p-1.5 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-xl transition-all border border-transparent hover:border-(--gold-soft) shadow-sm active:scale-95"
            title="Sincronizar"
          >
            <RefreshCw size={16} className={loading && orcamentos.length > 0 ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) font-black group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Nome do cliente"
              value={filters.nome}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
              className="premium-input py-2 pl-10 text-base shadow-xs font-bold"
            />
          </div>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) font-black group-focus-within:text-(--gold) transition-colors" size={14} />
            <input
              type="text"
              placeholder="Telefone"
              value={filters.telefone}
              onChange={(e) => handleFilterChange('telefone', e.target.value)}
              className="premium-input py-2 pl-10 text-base shadow-xs font-bold"
            />
          </div>

          <PremiumSelect
            placeholder="Status (Todos)"
            options={STATUS_ORDER.map((s) => ({ id: s, nome: s }))}
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          />

          <PremiumSelect
            placeholder="Filial (Todas)"
            options={branches}
            value={filters.filialId}
            onChange={(e) => handleFilterChange('filialId', e.target.value)}
          />

          <PremiumSelect
            placeholder="Responsável (Todos)"
            options={filteredUsers}
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
          />

          <PremiumSelect
            placeholder="Data (Qualquer)"
            options={[
              { id: 'Hoje', nome: 'Hoje' },
              { id: '7d', nome: 'Últimos 7 dias' },
              { id: '30d', nome: 'Últimos 30 dias' },
            ]}
            value={filters.data}
            onChange={(e) => handleFilterChange('data', e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="text-(--text-muted) text-sm font-medium bg-(--surface-3)/50 px-3 py-1 rounded-full border border-(--border) tabular-nums shadow-xs">
          {!loading && <span>{orcamentos.length} Orçamentos</span>}
        </div>
      </div>

      {/* Tabela */}
      <div className="w-full bg-(--surface-2) border border-(--border-subtle) rounded-2xl shadow-floating overflow-hidden mb-6">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="min-w-[1100px] w-full">
            <div className="grid grid-cols-[120px_3fr_2fr_2fr_2fr_1.2fr_1.2fr] gap-3 py-3 bg-(--surface-1)/50 border-b border-(--border-subtle) text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider px-4">
              <div>Número</div>
              <div>Lead</div>
              <div>Contato</div>
              <div>Responsável</div>
              <div>Unidade</div>
              <div>Data</div>
              <div>Status</div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-(--gold-soft) border-t-sky-500 rounded-full animate-spin" />
                <p className="text-(--text-muted) font-black text-sm animate-pulse">Sincronizando base...</p>
              </div>
            )}

            {!loading && orcamentos.length === 0 && (
              <div className="text-center py-20">
                <div className="w-12 h-12 bg-(--surface-1) rounded-3xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-muted)">
                  <Users size={24} />
                </div>
                <p className="text-(--text-muted) font-black text-sm">Nenhum orçamento encontrado.</p>
                <p className="text-sm text-(--text-muted) font-medium mt-1">
                  Vá em /crm/leads e clique em &quot;Nova Oportunidade&quot; em um Lead para criar o primeiro.
                </p>
              </div>
            )}

            {!loading &&
              orcamentos.map((orc) => {
                const lead = orc.lead || {};
                return (
                  <div
                    key={orc.id}
                    onClick={() => router.push(`/crm/oportunidade-de-negocio/${orc.id}`)}
                    className="grid grid-cols-[120px_3fr_2fr_2fr_2fr_1.2fr_1.2fr] gap-3 py-2.5 border-b border-(--border-subtle) hover:bg-(--gold-soft) transition-all items-center text-base px-4 group cursor-pointer"
                  >
                    <div className="truncate font-black text-(--gold) tracking-tight text-sm" title={orc.numero}>
                      {orc.numero}
                    </div>
                    <div className="truncate font-black text-(--text-primary) group-hover:text-(--gold-hover) tracking-tight" title={lead.nome}>
                      {lead.nome || '—'}
                    </div>
                    <div className="truncate text-(--text-secondary) font-bold tracking-tight">
                      {lead.celular || '—'}
                    </div>
                    <div className="truncate" title={lead.vendedor?.nome}>
                      <span className="bg-(--surface-1) px-2 py-0.5 rounded-xl text-sm font-black text-(--text-muted) border border-(--border-subtle) group-hover:bg-(--surface-2) group-hover:text-(--text-secondary) group-hover:border-(--border) transition-all tracking-tight">
                        {lead.vendedor?.nome || '—'}
                      </span>
                    </div>
                    <div className="truncate text-(--text-secondary) font-bold tracking-tight" title={lead.filial?.nome}>
                      {lead.filial?.nome || '—'}
                    </div>
                    <div className="truncate text-(--text-muted) font-bold text-sm tracking-tight">
                      {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="truncate">
                      <OrcamentoStatusBadge status={orc.status} size="xs" />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
