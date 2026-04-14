'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Edit, RefreshCw } from 'lucide-react';
import NovoLeadModal from '../fila-da-vez/components/NovoLeadModal';
import LeadDetailsDrawer from '@/components/ui/LeadDetailsDrawer';
import PremiumSelect from '@/components/ui/PremiumSelect';

export default function OportunidadeDeNegocioPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // States for dynamic selects
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);

  // Load branches and users for the selects
  useEffect(() => {
    async function loadSelectData() {
      try {
        const [resBranches, resUsers] = await Promise.all([
          api('/filiais'),
          api('/users')
        ]);
        const branches = resBranches?.data ?? (Array.isArray(resBranches) ? resBranches : []);
        setBranches(branches);
        const usersList = resUsers?.data ?? (Array.isArray(resUsers) ? resUsers : []);
        const vendedores = usersList.filter(u => String(u.perfil).toLowerCase() === 'vendedor');
        setUsers(vendedores);
      } catch (err) {
        console.error('Erro ao carregar dados dos filtros:', err);
      }
    }
    loadSelectData();
  }, []);

  // Filters state
  const [filters, setFilters] = useState({
    nome: '',
    telefone: '',
    status: '',
    canal: '',
    filialId: '',
    data: '', 
    etapa: '',
    parceria: '',
    origem: '',
    userId: ''
  });

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (key === 'data') {
          if (filters.data === 'Hoje') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            queryParams.append('dataInicio', start.toISOString());
          } else if (filters.data === '7d') {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            queryParams.append('dataInicio', start.toISOString());
          } else if (filters.data === '30d') {
            const start = new Date();
            start.setDate(start.getDate() - 30);
            queryParams.append('dataInicio', start.toISOString());
          }
        } else if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const result = await api(`/api/crm/orcamentos?${queryParams.toString()}`);

      if (result?.data && Array.isArray(result.data)) {
        setLeads(result.data);
      } else if (Array.isArray(result)) {
        setLeads(result);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchLeads]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const nextFilters = { ...prev, [field]: value };
      if (field === 'filialId') {
        nextFilters.userId = '';
      }
      return nextFilters;
    });
  };

  const filteredUsers = filters.filialId 
    ? users.filter(u => u.filialId === Number(filters.filialId))
    : users;

  const handleSaveLead = async (formDataInputs) => {
    try {
      await api('/api/crm/lead/manual', {
        method: 'POST',
        body: formDataInputs
      });
      fetchLeads();
    } catch (err) {
      throw err;
    }
  };

  return (
    <>
        <div className="max-w-[1600px] mx-auto">
          
          {/* Container de Filtros */}
          <div className="glass-card rounded-2xl p-4 mb-6 relative border border-white/60 shadow-floating bg-white/40 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                Oportunidade de Negócio
              </h2>
              <button 
                onClick={fetchLeads} 
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" 
                title="Sincronizar Dados"
              >
                <RefreshCw size={16} className={loading && leads.length > 0 ? 'animate-spin' : ''} />
              </button>
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Nome do cliente" 
                  value={filters.nome}
                  onChange={(e) => handleFilterChange('nome', e.target.value)}
                  className="premium-input py-2 pl-10 text-xs shadow-xs font-bold"
                />
              </div>

              <PremiumSelect 
                placeholder="Status (Todos)"
                options={[
                  { id: 'Ativo', nome: 'Ativo' },
                  { id: 'Desativado', nome: 'Desativado' }
                ]}
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
                placeholder="Etapa (Todas)"
                options={[
                  { id: 'Novo', nome: 'Novo' },
                  { id: 'Em Andamento', nome: 'Em Andamento' },
                  { id: 'Concluído', nome: 'Concluído' }
                ]}
                value={filters.etapa}
                onChange={(e) => handleFilterChange('etapa', e.target.value)}
              />

              <PremiumSelect 
                placeholder="Origem (Todas)"
                options={[
                  { id: 'Site', nome: 'Site' },
                  { id: 'Indicação', nome: 'Indicação' },
                  { id: 'Redes Sociais', nome: 'Redes Sociais' }
                ]}
                value={filters.origem}
                onChange={(e) => handleFilterChange('origem', e.target.value)}
              />

              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Telefone" 
                  value={filters.telefone}
                  onChange={(e) => handleFilterChange('telefone', e.target.value)}
                  className="premium-input py-2 pl-10 text-xs shadow-xs font-bold"
                />
              </div>

              <PremiumSelect 
                placeholder="Canal (Todos)"
                options={[
                  { id: 'WhatsApp', nome: 'WhatsApp' },
                  { id: 'Email', nome: 'Email' },
                  { id: 'Telefone', nome: 'Telefone' }
                ]}
                value={filters.canal}
                onChange={(e) => handleFilterChange('canal', e.target.value)}
              />

              <PremiumSelect 
                placeholder="Data (Qualquer)"
                options={[
                  { id: 'Hoje', nome: 'Hoje' },
                  { id: '7d', nome: 'Últimos 7 dias' },
                  { id: '30d', nome: 'Últimos 30 dias' }
                ]}
                value={filters.data}
                onChange={(e) => handleFilterChange('data', e.target.value)}
              />

              <PremiumSelect 
                placeholder="Parceria"
                options={[
                  { id: 'Sim', nome: 'Sim' },
                  { id: 'Não', nome: 'Não' }
                ]}
                value={filters.parceria}
                onChange={(e) => handleFilterChange('parceria', e.target.value)}
              />

              <PremiumSelect 
                placeholder="Responsável (Todos)"
                options={filteredUsers}
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />

            </div>
          </div>

          {/* Button Novo Lead & Results Summary */}
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="text-zinc-500 text-[10px] uppercase font-black bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200 tracking-tighter shadow-xs italic">
              {!loading && <span>{leads.length} Solicitações Ativas</span>}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-5 py-2 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-black shadow-lg shadow-sky-900/10 transition-all text-xs active:scale-95 whitespace-nowrap uppercase tracking-tight"
            >
              Novo Lead <Plus size={16} />
            </button>
          </div>

          {/* Tabela de Resultados */}
          <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-floating overflow-hidden mb-6">
            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <div className="min-w-[1400px] w-full">
                
                <div className="grid grid-cols-[50px_3fr_2fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-3 py-3 bg-slate-50/50 border-b border-slate-100 text-slate-500 font-black text-[10px] uppercase px-4 italic tracking-tighter">
                  <div className="text-center">#</div>
                  <div>Nome do Cliente</div>
                  <div>Contato</div>
                  <div>Responsável</div>
                  <div>Unidade</div>
                  <div>Canal</div>
                  <div>Origem</div>
                  <div>Data</div>
                  <div>Etapa</div>
                  <div>Status</div>
                </div>

                {loading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-slate-400 font-black text-[10px] uppercase animate-pulse">Sincronizando Base...</p>
                  </div>
                )}

                {!loading && leads.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-slate-100 text-slate-300">
                       <Search size={24} />
                    </div>
                    <p className="text-slate-400 font-black text-[10px] uppercase">Nenhum registro encontrado.</p>
                  </div>
                )}

                {!loading && leads.map((lead) => (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="grid grid-cols-[50px_3fr_2fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-3 py-1.5 border-b border-slate-50 hover:bg-sky-50 transition-all items-center text-[11px] px-4 group cursor-pointer relative"
                  >
                    <div className="flex justify-center text-slate-200 group-hover:text-sky-600 transition-colors">
                      <Edit size={14} />
                    </div>
                    <div className="truncate font-black text-slate-900 group-hover:text-sky-700 uppercase tracking-tighter" title={lead.nome}>{lead.nome || '—'}</div>
                    <div className="truncate text-slate-500 font-bold tracking-tighter uppercase">{lead.celular || lead.telefone || '—'}</div>
                    <div className="truncate" title={(lead.vendedor || lead.user)?.nome}>
                      <span className="bg-slate-50 px-2 py-0.5 rounded-xl text-[9px] font-black text-slate-400 border border-slate-100 group-hover:bg-white group-hover:text-slate-600 group-hover:border-slate-200 transition-all uppercase tracking-tighter">{(lead.vendedor || lead.user)?.nome || '—'}</span>
                    </div>
                    <div className="truncate text-slate-600 font-bold uppercase tracking-tighter" title={lead.filial?.nome}>{lead.filial?.nome || '—'}</div>
                    <div className="truncate">
                      <span className="text-[9px] font-black text-sky-500 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100 uppercase tracking-tighter">{lead.canal || '—'}</span>
                    </div>
                    <div className="truncate text-slate-400 font-bold text-[9px] uppercase tracking-tighter">{lead.origem || '—'}</div>
                    <div className="truncate text-slate-400 font-bold text-[9px] uppercase tracking-tighter">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
                    <div className="truncate font-black text-sky-600 text-[10px] uppercase tracking-tighter">{lead.etapa || '—'}</div>
                    <div className="truncate">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border shadow-xs uppercase tracking-tighter ${
                        lead.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {lead.status === 'Ativo' ? '● Ativo' : '● Inativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
        
        {isModalOpen && (
          <NovoLeadModal 
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveLead}
          />
        )}
        
        <LeadDetailsDrawer
          isOpen={!!selectedLead}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
    </>
  );
}
