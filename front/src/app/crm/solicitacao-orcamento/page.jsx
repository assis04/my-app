'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Edit, Menu, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import NovoLeadModal from '../../captacao/fila/components/NovoLeadModal';
import LeadDetailsDrawer from '@/components/ui/LeadDetailsDrawer';
import PremiumSelect from '@/components/ui/PremiumSelect';

export default function SolicitacaoOrcamentoPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        if (Array.isArray(resBranches)) setBranches(resBranches);
        if (Array.isArray(resUsers)) {
          // Filtrar somente Vendedores
          const vendedores = resUsers.filter(u => String(u.perfil).toLowerCase() === 'vendedor');
          setUsers(vendedores);
        }
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

      const data = await api(`/api/crm/orcamentos?${queryParams.toString()}`);
      
      if (Array.isArray(data)) {
        setLeads(data);
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
      await api('/api/captacao/lead/manual', {
        method: 'POST',
        body: formDataInputs
      });
      fetchLeads();
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/10 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 pt-16 md:pt-8 bg-slate-50">
        <div className="max-w-[1600px] mx-auto">
          
          {/* Container de Filtros */}
          <div className="glass-card rounded-2xl p-8 mb-8 relative border border-white/60 shadow-floating bg-white/40 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                Filtros
              </h2>
              <button 
                onClick={fetchLeads} 
                className="p-3 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-2xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" 
                title="Sincronizar Dados"
              >
                <RefreshCw size={18} className={loading && leads.length > 0 ? 'animate-spin' : ''} />
              </button>
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Nome do cliente" 
                  value={filters.nome}
                  onChange={(e) => handleFilterChange('nome', e.target.value)}
                  className="premium-input py-4 pl-12 text-sm shadow-sm"
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black group-focus-within:text-sky-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Telefone" 
                  value={filters.telefone}
                  onChange={(e) => handleFilterChange('telefone', e.target.value)}
                  className="premium-input py-4 pl-12 text-sm shadow-sm"
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
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="text-zinc-500 text-sm font-medium bg-slate-100/50 px-4 py-1 rounded-full border border-slate-200">
              {!loading && <span>{leads.length} Solicitações de orçamento</span>}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-6 py-2.5 rounded-full hover:shadow-sky-200/50 hover:shadow-xl font-bold shadow-lg shadow-sky-900/10 transition-all text-sm active:scale-95"
            >
              Novo Lead <Plus size={18} />
            </button>
          </div>

          {/* Tabela de Resultados */}
          <div className="w-full bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl shadow-floating overflow-hidden mb-12">
            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <div className="min-w-[1400px] w-full">
                
                <div className="grid grid-cols-[60px_3fr_2fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-4 py-6 bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold text-xs px-8">
                  <div className="text-center">#</div>
                  <div>Nome</div>
                  <div>Telefone</div>
                  <div>Responsável</div>
                  <div>Filial</div>
                  <div>Canal</div>
                  <div>Origem</div>
                  <div>Data</div>
                  <div>Etapa</div>
                  <div>Status</div>
                </div>

                {loading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin" />
                    <p className="text-slate-400 font-medium text-sm animate-pulse">Sincronizando Base de Dados...</p>
                  </div>
                )}

                {!loading && leads.length === 0 && (
                  <div className="text-center py-24">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-300">
                       <Search size={32} />
                    </div>
                    <p className="text-slate-400 font-medium text-sm">Nenhuma solicitação encontrada.</p>
                  </div>
                )}

                {!loading && leads.map((lead) => (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="grid grid-cols-[60px_3fr_2fr_2fr_2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-4 py-5 border-b border-slate-50 hover:bg-sky-50 transition-all items-center text-sm px-8 group cursor-pointer relative"
                  >
                    <div className="flex justify-center text-slate-300 group-hover:text-sky-600 transition-colors">
                      <Edit size={16} />
                    </div>
                    <div className="truncate font-black text-slate-900 group-hover:text-sky-700" title={lead.nome}>{lead.nome || '—'}</div>
                    <div className="truncate text-slate-500 font-bold">{lead.telefone || '—'}</div>
                    <div className="truncate" title={lead.user?.nome}>
                      <span className="bg-slate-100 px-3 py-1 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">{lead.user?.nome || '—'}</span>
                    </div>
                    <div className="truncate text-slate-600 font-bold" title={lead.filial?.nome}>{lead.filial?.nome || '—'}</div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-sky-500 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">{lead.canal || '—'}</span>
                    </div>
                    <div className="truncate text-slate-500 font-medium text-xs">{lead.origem || '—'}</div>
                    <div className="truncate text-slate-500 font-medium text-xs">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
                    <div className="truncate font-semibold text-sky-600 text-xs">{lead.etapa || '—'}</div>
                    <div className="truncate">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border shadow-xs ${
                        lead.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-900/5' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-900/5'
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
      </main>
    </div>
  );
}
