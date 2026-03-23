'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, ChevronDown, Plus, Edit, Menu } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import NovoLeadModal from '../../captacao/fila/components/NovoLeadModal';
import LeadDetailsDrawer from '@/components/ui/LeadDetailsDrawer';

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
      
      // Validação defensiva
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

  // Debounced fetch
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchLeads]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      const nextFilters = { ...prev, [field]: value };
      
      // Se trocar de filial, reseta o responsável selecionado para evitar inconsistência
      if (field === 'filialId') {
        nextFilters.userId = '';
      }
      
      return nextFilters;
    });
  };

  // Filtrar responsáveis dinamicamente baseado na filial escolhida
  const filteredUsers = filters.filialId 
    ? users.filter(u => u.filialId === Number(filters.filialId))
    : users;

  // Lógica de Salvamento para o Novo Lead Modal
  const handleSaveLead = async (formDataInputs) => {
    try {
      await api('/api/captacao/lead/manual', {
        method: 'POST',
        body: formDataInputs
      });
      fetchLeads(); // Atualiza a tabela após criação
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans relative">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-[#1c1c1c] p-2 rounded-xl border border-zinc-800 text-zinc-300"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 pt-16 md:pt-8 bg-[#212121]">
        <div className="max-w-[1600px] mx-auto">
          
          {/* Container de Filtros */}
          <div className="bg-[#1c1c1c] rounded-2xl p-6 mb-6 shadow-sm border border-zinc-800 relative">
            <h2 className="text-xl font-medium text-zinc-300 mb-6 flex items-center gap-3">
              Filtros de Busca
            </h2>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Nome */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Nome" 
                  value={filters.nome}
                  onChange={(e) => handleFilterChange('nome', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all placeholder:text-zinc-500 text-zinc-200"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Status (Todos)</option>
                  <option value="Ativo" className="bg-[#1c1c1c] text-zinc-200">Ativo</option>
                  <option value="Desativado" className="bg-[#1c1c1c] text-zinc-200">Desativado</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Filial */}
              <div className="relative">
                <select 
                  value={filters.filialId}
                  onChange={(e) => handleFilterChange('filialId', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Filial (Todas)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-[#1c1c1c] text-zinc-200">{b.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Etapa */}
              <div className="relative">
                <select 
                  value={filters.etapa}
                  onChange={(e) => handleFilterChange('etapa', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Etapa (Todas)</option>
                  <option value="Novo" className="bg-[#1c1c1c] text-zinc-200">Novo</option>
                  <option value="Em Andamento" className="bg-[#1c1c1c] text-zinc-200">Em Andamento</option>
                  <option value="Concluído" className="bg-[#1c1c1c] text-zinc-200">Concluído</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Origem */}
              <div className="relative">
                <select 
                  value={filters.origem}
                  onChange={(e) => handleFilterChange('origem', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Origem (Todas)</option>
                  <option value="Site" className="bg-[#1c1c1c] text-zinc-200">Site</option>
                  <option value="Indicação" className="bg-[#1c1c1c] text-zinc-200">Indicação</option>
                  <option value="Redes Sociais" className="bg-[#1c1c1c] text-zinc-200">Redes Sociais</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Telefone */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Telefone" 
                  value={filters.telefone}
                  onChange={(e) => handleFilterChange('telefone', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all placeholder:text-zinc-500 text-zinc-200"
                />
              </div>

              {/* Canal */}
              <div className="relative">
                <select 
                  value={filters.canal}
                  onChange={(e) => handleFilterChange('canal', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Canal (Todos)</option>
                  <option value="WhatsApp" className="bg-[#1c1c1c] text-zinc-200">WhatsApp</option>
                  <option value="Email" className="bg-[#1c1c1c] text-zinc-200">Email</option>
                  <option value="Telefone" className="bg-[#1c1c1c] text-zinc-200">Telefone</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Data */}
              <div className="relative">
                <select 
                  value={filters.data}
                  onChange={(e) => handleFilterChange('data', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Data (Qualquer)</option>
                  <option value="Hoje" className="bg-[#1c1c1c] text-zinc-200">Hoje</option>
                  <option value="7d" className="bg-[#1c1c1c] text-zinc-200">Últimos 7 dias</option>
                  <option value="30d" className="bg-[#1c1c1c] text-zinc-200">Últimos 30 dias</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Parceria */}
              <div className="relative">
                <select 
                  value={filters.parceria}
                  onChange={(e) => handleFilterChange('parceria', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Parceria</option>
                  <option value="Sim" className="bg-[#1c1c1c] text-zinc-200">Sim</option>
                  <option value="Não" className="bg-[#1c1c1c] text-zinc-200">Não</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

              {/* Responsável */}
              <div className="relative">
                <select 
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-xl py-2 px-4 pr-10 text-sm appearance-none focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all text-zinc-300 cursor-pointer"
                >
                  <option value="" className="bg-[#1c1c1c] text-zinc-400">Responsável (Todos)</option>
                  {filteredUsers.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#1c1c1c] text-zinc-200">{u.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>

            </div>
          </div>

          {/* Button Novo Lead & Results Summary */}
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="text-zinc-500 text-sm">
              {!loading && <span>{leads.length} resultado{leads.length !== 1 ? 's' : ''}</span>}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white px-5 py-2 rounded-full hover:opacity-90 font-medium shadow-lg shadow-sky-900/20 transition-all text-sm"
            >
              Novo Lead <Plus size={16} />
            </button>
          </div>

          {/* Tabela de Resultados */}
          <div className="w-full bg-[#1c1c1c] border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[1000px] w-full">
                
                {/* Header */}
                <div className="grid grid-cols-[50px_2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 py-3 bg-zinc-800/20 border-b border-zinc-800 text-zinc-300 font-semibold text-xs uppercase tracking-wider px-4">
                  <div className="text-center"></div>
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

                {/* Loading */}
                {loading && <div className="text-center py-12 text-zinc-500 tracking-wider text-sm font-medium">Atualizando leads...</div>}

                {/* Rows */}
                {!loading && leads.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-sm">Nenhum registro encontrado para os filtros selecionados.</div>
                )}

                {!loading && leads.map((lead) => (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="grid grid-cols-[50px_2fr_1.5fr_1.5fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 py-3.5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center text-sm px-4 group cursor-pointer"
                  >
                    <div className="flex justify-center text-zinc-600 group-hover:text-[#0ea5e9] transition-colors">
                      <Edit size={16} />
                    </div>
                    <div className="truncate font-medium text-zinc-200" title={lead.nome}>{lead.nome || '—'}</div>
                    <div className="truncate text-zinc-400">{lead.telefone || '—'}</div>
                    <div className="truncate text-zinc-300" title={lead.user?.nome}>{lead.user?.nome || '—'}</div>
                    <div className="truncate text-zinc-300" title={lead.filial?.nome}>{lead.filial?.nome || '—'}</div>
                    <div className="truncate text-zinc-400">{lead.canal || '—'}</div>
                    <div className="truncate text-zinc-400">{lead.origem || '—'}</div>
                    <div className="truncate text-zinc-400">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</div>
                    <div className="truncate font-medium text-zinc-300">{lead.etapa || '—'}</div>
                    <div className="truncate">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {lead.status || 'Ativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Renderização do Pop-up de Criação de Leads */}
        {isModalOpen && (
          <NovoLeadModal 
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveLead}
          />
        )}
        
        {/* Painel Lateral com Detalhes do Lead */}
        <LeadDetailsDrawer
          isOpen={!!selectedLead}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      </main>
    </div>
  );
}
