'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, ChevronDown, FolderOpen, Menu, X, Eye, FileUp, FileText } from 'lucide-react';
import { useSalesQueue } from '@/hooks/useSalesQueue';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import NovoLeadModal from './components/NovoLeadModal';
import { formatPhone } from '@/lib/utils';


function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

export default function CaptacaoFilaPage() {
  const { user, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  // State for the direct input boxes
  const [phoneInputs, setPhoneInputs] = useState({});
  
  // State for the new lead modal
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterVendedor, setFilterVendedor] = useState('');

  const isAdmOrSupervisor = user?.permissions?.includes('*') || user?.permissions?.includes('captacao:leads:manage');

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await api('/filiais');
        if (res && res.length > 0) {
          setBranches(res);
          if (isAdmOrSupervisor) {
            setSelectedBranchId(String(res[0].id));
          } else {
            setSelectedBranchId(String(user?.filialId || res[0].id));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar filiais:', err);
      }
    }
    if (!authLoading && user) {
      fetchBranches();
    }
  }, [user, authLoading, isAdmOrSupervisor]);

  const { 
    queue, 
    history, 
    loading: queueLoading, 
    handleCreateManualLead, 
    handleToggleAgentStatus,
    refetch 
  } = useSalesQueue(selectedBranchId);

  // Permissão para alternar status de OUTROS
  const canToggleOthers = useMemo(() => {
    const isAdm = ['ADM', 'Administrador', 'admin'].includes(user?.role);
    const isGerente = ['Gerente', 'GERENTE'].includes(user?.role);
    const sameBranch = Number(user?.filialId) === Number(selectedBranchId);
    return isAdm || (isGerente && sameBranch);
  }, [user, selectedBranchId]);

  // Derived: unique sellers from history for the filter dropdown
  const uniqueVendedores = useMemo(() => {
    const map = new Map();
    history.forEach(lead => {
      if (lead.user?.id && lead.user?.nome) {
        map.set(lead.user.id, lead.user.nome);
      }
    });
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [history]);

  // Filtered history based on search and filter
  const filteredHistory = useMemo(() => {
    let items = history;

    // Search filter (name, phone, ID)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(lead =>
        (lead.nome && lead.nome.toLowerCase().includes(term)) ||
        (lead.telefone && lead.telefone.includes(term)) ||
        (lead.user?.nome && lead.user.nome.toLowerCase().includes(term)) ||
        (String(lead.id).includes(term))
      );
    }

    // Vendedor filter
    if (filterVendedor) {
      items = items.filter(lead => String(lead.user?.id) === filterVendedor);
    }

    return items;
  }, [history, searchTerm, filterVendedor]);

  const handlePhoneChange = (agentId, value) => {
    setPhoneInputs(prev => ({ ...prev, [agentId]: formatPhone(value) }));
  };

  const submitDirectLead = async (agentId, agentName, e) => {
    e.preventDefault();
    const phone = phoneInputs[agentId];
    if (!phone) return;
    
    // Open the Modal with the first agent pre-selected
    setModalData({
      initialPhone: phone,
      agentId,
      agentName,
      branchId: selectedBranchId,
      branchName: branches.find(b => String(b.id) === selectedBranchId)?.nome || selectedBranchId
    });
    setIsModalOpen(true);
  };

  // "Novo Lead Manual" button: opens modal with first available agent and empty phone
  const openNewLeadModal = () => {
    const firstAvailable = queue.find(a => a.isAvailable);
    if (!firstAvailable) {
      alert('Nenhum vendedor disponível para receber leads.');
      return;
    }
    setModalData({
      initialPhone: '',
      agentId: firstAvailable.id,
      agentName: firstAvailable.nome,
      branchId: selectedBranchId,
      branchName: branches.find(b => String(b.id) === selectedBranchId)?.nome || selectedBranchId
    });
    setIsModalOpen(true);
  };

  if (authLoading) return null;

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
        
        {/* 🔹 FILA DA VEZ SECTION */}
        <div className="mb-10 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h1 className="text-3xl font-light text-zinc-100">Fila da vez</h1>
              <p className="text-base text-zinc-500 mt-1">Atribuição e roteamento de leads</p>
            </div>
            
            <div className="relative">
              <select
                className="appearance-none bg-[#1c1c1c] border border-zinc-800 rounded-xl px-4 py-2 pr-10 text-sm text-zinc-300 outline-none focus:border-[#0ea5e9] disabled:opacity-50 min-w-[150px] transition-colors"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!isAdmOrSupervisor}
              >
                {branches.length === 0 && <option>Carregando...</option>}
                {branches.map(b => (
                  <option key={b.id} value={String(b.id)} className="bg-zinc-800 text-zinc-200">{b.nome}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <div className="w-full relative bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm mb-10">
            {queueLoading && queue.length === 0 && (
               <div className="text-zinc-500 py-4 opacity-50 flex items-center justify-center">Atualizando Fila...</div>
            )}
            {queue.length === 0 && !queueLoading && (
              <div className="text-zinc-500 py-4">Nenhum vendedor cadastrado nesta filial.</div>
            )}
            {queue.map((agent, index) => (
              <div key={agent.id} className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-zinc-800/60 gap-4 sm:gap-0 transition-all hover:bg-zinc-800/10 px-2 rounded-lg">
                <span className="w-12 text-zinc-400 font-medium">{index + 1}º</span>
                
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-zinc-500 whitespace-nowrap text-base">Telefone:</span>
                  <form onSubmit={(e) => submitDirectLead(agent.id, agent.nome, e)} className="w-full sm:w-auto flex items-center">
                    <input 
                      type="text" 
                      placeholder={index === 0 ? "Novo lead (Enter)" : ""}
                      value={phoneInputs[agent.id] || ''}
                      onChange={(e) => handlePhoneChange(agent.id, e.target.value)}
                      disabled={!agent.isAvailable}
                      className="bg-[#2a2a2a] border border-zinc-700/80 rounded-xl h-11 px-4 w-full sm:w-72 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] text-zinc-200 text-base disabled:opacity-50 transition-all font-medium"
                    />
                    <button type="submit" className="hidden">Submit</button>
                  </form>
                </div>

                <div className="flex-1 text-zinc-200 flex items-center justify-between font-medium text-lg">
                  <div className="flex items-center gap-4">
                    {agent.nome}
                    {!agent.isAvailable ? (
                      <span className="text-[11px] text-red-400 border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Off</span>
                    ) : (
                      <span className="text-[11px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                    )}
                  </div>
                  
                  {(user?.id === agent.id || canToggleOthers) && (
                     <button 
                       onClick={() => {
                         handleToggleAgentStatus(agent.id, !agent.isAvailable)
                           .catch(err => alert(err.message || "Erro ao mudar status"));
                       }}
                       className="text-xs text-[#0ea5e9] underline hover:text-white"
                     >
                       {user?.id === agent.id ? 'Alternar Meu Status' : 'Alternar Status'}
                     </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔹 HISTÓRICO DE ATENDIMENTO SECTION */}
        <div className="max-w-[1600px] mx-auto bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-medium text-zinc-300 mb-6 flex items-center gap-3">
            <FolderOpen size={22} className="text-[#0ea5e9]" /> Histórico de Relacionamento
          </h2>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-4 sm:gap-3 w-full sm:w-auto flex-wrap">
              {/* 🔍 Search bar */}
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <input 
                  type="text" 
                  placeholder="Buscar por nome, telefone, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#2a2a2a] text-sm text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all placeholder:text-zinc-600"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* 🎚️ Filter dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-2 text-sm whitespace-nowrap px-3 py-2.5 rounded-xl transition-colors border ${
                    filterVendedor 
                      ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9]' 
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Filter size={16} />
                  {filterVendedor ? uniqueVendedores.find(v => String(v.id) === filterVendedor)?.nome || 'Filtrado' : 'Filtro'}
                </button>

                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 z-20 bg-[#1c1c1c] border border-zinc-700 rounded-xl shadow-2xl w-56 overflow-hidden">
                      <div className="p-2 border-b border-zinc-800">
                        <p className="text-xs text-zinc-500 px-2 py-1 uppercase tracking-wider">Filtrar por vendedor</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button 
                          onClick={() => { setFilterVendedor(''); setFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!filterVendedor ? 'text-[#0ea5e9] bg-[#0ea5e9]/10' : 'text-zinc-300 hover:bg-zinc-800'}`}
                        >
                          Todos
                        </button>
                        {uniqueVendedores.map(v => (
                          <button 
                            key={v.id}
                            onClick={() => { setFilterVendedor(String(v.id)); setFilterOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(v.id) === filterVendedor ? 'text-[#0ea5e9] bg-[#0ea5e9]/10' : 'text-zinc-300 hover:bg-zinc-800'}`}
                          >
                            {v.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Clear all filters */}
              {(searchTerm || filterVendedor) && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterVendedor(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline whitespace-nowrap"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            
            {/* ➕ Novo Lead Manual button */}
            <button 
              onClick={openNewLeadModal}
              className="flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white px-5 py-2.5 rounded-full hover:opacity-90 font-medium shadow-lg shadow-sky-900/20 transition-all text-sm"
            >
              Novo Lead Manual <Plus size={16} />
            </button>
          </div>

          {/* Results count */}
          {(searchTerm || filterVendedor) && (
            <p className="text-xs text-zinc-500 mb-4">
              {filteredHistory.length} resultado{filteredHistory.length !== 1 ? 's' : ''} encontrado{filteredHistory.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* DATA TABLE */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-base whitespace-nowrap text-zinc-400 border-collapse">
              <thead className="border-b border-zinc-800 text-zinc-100">
                <tr>
                  <th className="pb-4 pt-2 font-semibold px-3 w-12 text-center"></th>
                  <th className="pb-4 pt-2 font-semibold px-3 w-24">Status</th>
                  <th className="pb-4 pt-2 font-semibold px-3 w-28">Etapa</th>
                  <th className="pb-4 pt-2 font-semibold px-3 min-w-[160px]">Lead</th>
                  <th className="pb-4 pt-2 font-semibold px-3 min-w-[120px]">Vendedor</th>
                  <th className="pb-4 pt-2 font-semibold px-3 min-w-[120px]">Imóvel</th>
                  <th className="pb-4 pt-2 font-semibold px-3 w-20 text-center">Planta</th>
                  <th className="pb-4 pt-2 font-semibold px-3 w-36">Data de Solicitação</th>
                  <th className="pb-4 pt-2 font-semibold px-3 w-36 text-right">Última Interação</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-zinc-600">
                      {searchTerm || filterVendedor ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Nenhum lead registrado ainda.'}
                    </td>
                  </tr>
                )}
                {filteredHistory.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors group">
                    <td className="py-4 px-2 text-zinc-500 text-center uppercase text-[10px] font-bold">#{lead.id}</td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit border ${
                        lead.status === 'Ativo' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {lead.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-sm font-medium text-zinc-300">{lead.etapa || 'Novo'}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 font-semibold">{lead.nome || '—'}</span>
                        <span className="text-xs text-zinc-500">{lead.telefone || '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="text-zinc-300 text-sm font-medium">{lead.user?.nome || '???'}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="text-zinc-300 text-sm">{lead.tipoImovel || '—'}</span>
                        <span className="text-[11px] text-zinc-500">{lead.statusImovel || '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      {lead.plantaPath ? (
                        <a 
                          href={`http://localhost:3002/${lead.plantaPath}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all"
                          title="Ver Planta"
                        >
                          <FileUp size={16} />
                        </a>
                      ) : (
                        <span className="text-zinc-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-zinc-400 text-xs font-medium">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-4 px-2 text-zinc-500 text-xs text-right font-medium">{timeAgo(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Render the modal when open */}
      {isModalOpen && modalData && (
        <NovoLeadModal
          initialPhone={modalData.initialPhone}
          agentId={modalData.agentId}
          agentName={modalData.agentName}
          branchId={modalData.branchId}
          branchName={modalData.branchName}
          sellers={queue}
          onClose={() => setIsModalOpen(false)}
          onSave={async (leadData) => {
            await handleCreateManualLead(leadData);
            setPhoneInputs(prev => ({ ...prev, [modalData.agentId]: '' }));
            await refetch();
          }}
        />
      )}
    </div>
  );
}
