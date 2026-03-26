'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FolderOpen, Menu, X, FileUp, Edit, RefreshCw } from 'lucide-react';
import { useSalesQueue } from '@/hooks/useSalesQueue';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import NovoLeadModal from './components/NovoLeadModal';
import LeadDetailsDrawer from '@/components/ui/LeadDetailsDrawer';
import { formatPhone } from '@/lib/utils';
import PremiumSelect from '@/components/ui/PremiumSelect';


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
  
  const [phoneInputs, setPhoneInputs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendedor, setFilterVendedor] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('7d');

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

  const canToggleOthers = useMemo(() => {
    const isAdm = ['ADM', 'Administrador', 'admin'].includes(user?.role);
    const isGerente = ['Gerente', 'GERENTE'].includes(user?.role);
    const sameBranch = Number(user?.filialId) === Number(selectedBranchId);
    return isAdm || (isGerente && sameBranch);
  }, [user, selectedBranchId]);

  const uniqueVendedores = useMemo(() => {
    const map = new Map();
    history.forEach(lead => {
      if (lead.user?.id && lead.user?.nome) {
        map.set(String(lead.user.id), lead.user.nome);
      }
    });
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [history]);

  const firstAvailableIndex = useMemo(() => queue.findIndex(a => a.isAvailable), [queue]);

  const filteredHistory = useMemo(() => {
    let items = history;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      items = items.filter(lead =>
        (lead.nome && lead.nome.toLowerCase().includes(term)) ||
        (lead.telefone && lead.telefone.includes(term)) ||
        (lead.user?.nome && lead.user.nome.toLowerCase().includes(term)) ||
        (String(lead.id).includes(term))
      );
    }
    if (filterVendedor) {
      items = items.filter(lead => String(lead.user?.id) === filterVendedor);
    }
    if (filterPeriodo !== 'todos') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const cutoffDate = new Date();
      cutoffDate.setHours(0, 0, 0, 0);
      if (filterPeriodo === 'hoje') {} 
      else if (filterPeriodo === '7d') cutoffDate.setDate(now.getDate() - 7);
      else if (filterPeriodo === '30d') cutoffDate.setDate(now.getDate() - 30);
      items = items.filter(lead => {
        if (!lead.createdAt) return false;
        const leadDate = new Date(lead.createdAt);
        return leadDate >= cutoffDate && leadDate <= now;
      });
    }
    return items;
  }, [history, searchTerm, filterVendedor, filterPeriodo]);

  const handlePhoneChange = React.useCallback((agentId, value) => {
    setPhoneInputs(prev => ({ ...prev, [agentId]: formatPhone(value) }));
  }, []);

  const submitDirectLead = React.useCallback(async (agentId, agentName, e) => {
    e.preventDefault();
    const phone = phoneInputs[agentId];
    if (!phone) return;
    setModalData({
      initialPhone: phone,
      agentId,
      agentName,
      branchId: selectedBranchId,
      branchName: branches.find(b => String(b.id) === selectedBranchId)?.nome || selectedBranchId
    });
    setIsModalOpen(true);
  }, [phoneInputs, selectedBranchId, branches]);

  const openNewLeadModal = React.useCallback(() => {
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
  }, [queue, selectedBranchId, branches]);

  const RenderedQueue = useMemo(() => {
    return queue.map((agent, index) => (
      <div key={agent.id} className="flex flex-col sm:flex-row sm:items-center py-5 border-b border-slate-50 last:border-0 gap-4 sm:gap-0 transition-all hover:bg-slate-50/80 px-4 rounded-2xl group">
        <span className="w-12 text-slate-300 font-black text-lg italic tracking-tighter group-hover:text-sky-400 transition-colors">
          {String(index + 1).padStart(2, '0')}
        </span>
        
        <div className="flex items-center gap-6 flex-1">
          <span className="text-slate-400 whitespace-nowrap text-xs font-bold">Atribuir Lead:</span>
          <form onSubmit={(e) => submitDirectLead(agent.id, agent.nome, e)} className="w-full sm:w-auto flex items-center relative">
            <input 
              type="text" 
              placeholder={agent.isAvailable && index === firstAvailableIndex ? "Digite o telefone..." : ""}
              value={phoneInputs[agent.id] || ''}
              onChange={(e) => handlePhoneChange(agent.id, e.target.value)}
              disabled={!agent.isAvailable}
              className="bg-slate-50/50 border border-slate-200 rounded-xl h-12 px-5 w-full sm:w-80 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 text-slate-900 text-base disabled:opacity-50 disabled:bg-slate-100 transition-all font-bold placeholder:text-slate-300 shadow-inner"
            />
            {agent.isAvailable && index === firstAvailableIndex && !phoneInputs[agent.id] && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-sky-100 text-sky-600 px-2 py-0.5 rounded text-[10px] font-black uppercase pointer-events-none">ENTER</div>
            )}
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>

        <div className="flex-1 text-slate-900 flex items-center justify-between pl-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="font-black text-lg text-slate-900 group-hover:text-sky-700 transition-colors leading-tight">{agent.nome}</span>
              <span className="text-xs font-bold text-slate-400 leading-none mt-0.5">Vendedor</span>
            </div>
            {!agent.isAvailable ? (
              <span className="text-[10px] font-semibold text-rose-600 border border-rose-100 bg-rose-50 px-2.5 py-1 rounded-full shadow-sm">Ausente</span>
            ) : agent.isAvailable && index === firstAvailableIndex ? (
              <span className="text-[10px] font-semibold text-emerald-600 border border-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-full shadow-sm">Na Vez</span>
            ) : (
              <span className="text-[10px] font-semibold text-sky-600 border border-sky-100 bg-sky-50 px-2.5 py-1 rounded-full shadow-sm">Disponível</span>
            )}
          </div>
          
          {(user?.id === agent.id || canToggleOthers) && (
             <button 
               onClick={() => {
                 handleToggleAgentStatus(agent.id, !agent.isAvailable)
                   .catch(err => alert(err.message || "Erro ao mudar status"));
               }}
               className="text-xs font-bold text-sky-600 hover:text-white hover:bg-sky-600 px-4 py-2.5 rounded-xl border border-sky-100 bg-sky-50 transition-all shadow-sm ring-sky-500/10 focus:ring-4 active:scale-95"
             >
               {user?.id === agent.id ? 'Meu Status' : 'Alterar Status'}
             </button>
          )}
        </div>
      </div>
    ));
  }, [queue, firstAvailableIndex, phoneInputs, user, canToggleOthers, handleToggleAgentStatus, submitDirectLead, handlePhoneChange]);

  if (authLoading) return null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
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
        
        <div className="mb-10 max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fila da Vez</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={refetch} 
                className="p-3 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-2xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95" 
                title="Sincronizar Fila"
              >
                <RefreshCw size={18} className={queueLoading ? 'animate-spin' : ''} />
              </button>
              <div className="w-64">
                <PremiumSelect 
                placeholder="Selecione a Filial"
                options={branches}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!isAdmOrSupervisor}
              />
            </div>
          </div>
        </div>

          <div className="w-full relative glass-card border border-white/60 rounded-3xl p-4 shadow-floating overflow-hidden transition-all bg-white/40 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-2.5 h-full bg-sky-500 shadow-[4px_0_15px_rgba(14,165,233,0.3)]" />
            
            {queueLoading && queue.length === 0 && (
               <div className="text-slate-400 py-10 opacity-70 flex items-center justify-center font-bold text-sm animate-pulse">
                 Sincronizando Fila Digital...
               </div>
            )}
            {queue.length === 0 && !queueLoading && (
              <div className="text-slate-400 py-10 text-center font-medium italic">Nenhum vendedor disponível nesta unidade.</div>
            )}
            
            <div className="space-y-2">
              {RenderedQueue}
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto glass-card border border-white/60 rounded-3xl p-10 shadow-floating mb-20 bg-white/40 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-800 mb-10 flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <FolderOpen size={22} className="text-sky-500" />
            </div>
            Histórico de atendimento
          </h2>
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full xl:w-auto">
              
              <div className="relative group min-w-[280px]">
                <input 
                  type="text" 
                  placeholder="Nome, telefone, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 text-sm text-slate-900 pl-11 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 outline-none transition-all placeholder:text-slate-400 font-bold shadow-inner"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black" />
              </div>
              
              <PremiumSelect 
                placeholder="Período"
                options={[
                  { id: 'hoje', nome: 'Hoje' },
                  { id: '7d', nome: 'Últimos 7 dias' },
                  { id: '30d', nome: 'Últimos 30 dias' },
                  { id: 'todos', nome: 'Todo o Histórico' }
                ]}
                value={filterPeriodo}
                onChange={(e) => setFilterPeriodo(e.target.value)}
              />

              <PremiumSelect 
                placeholder="Responsável"
                options={uniqueVendedores}
                value={filterVendedor}
                onChange={(e) => setFilterVendedor(e.target.value)}
              />

              {(searchTerm || filterVendedor || filterPeriodo !== '7d') && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterVendedor(''); setFilterPeriodo('7d'); }}
                  className="h-full px-6 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 border border-slate-200 rounded-2xl active:scale-95"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-xs text-slate-400 font-bold leading-tight">Filial</span>
                <span className="text-sm font-black text-sky-600 leading-tight">
                  {branches.find(b => String(b.id) === String(selectedBranchId))?.nome || 'GLOBAL'}
                </span>
              </div>

              <button 
                onClick={openNewLeadModal}
                className="flex items-center gap-3 bg-linear-to-r from-sky-500 to-sky-600 text-white px-10 py-2 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl hover:-translate-y-1 font-bold shadow-xl shadow-sky-900/10 transition-all text-sm active:scale-95"
              >
                Novo Lead 
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-bold text-xs border-b border-slate-100">
                  <tr>
                    <th className="py-5 px-8 text-center w-[60px]">ID</th>
                    <th className="py-5 px-6">Status</th>
                    <th className="py-5 px-6">Etapa</th>
                    <th className="py-5 px-6">Lead</th>
                    <th className="py-5 px-6">Responsável</th>
                    <th className="py-5 px-6">Origem / Canal</th>
                    <th className="py-5 px-6 text-center">Docs</th>
                    <th className="py-5 px-6">Registro</th>
                    <th className="py-5 px-8 text-right">Interação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-24 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-200">
                           <FolderOpen size={32} />
                        </div>
                        <p className="text-slate-400 font-medium text-sm">Nenhum registro localizado no histórico.</p>
                      </td>
                    </tr>
                  )}
                  {filteredHistory.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-sky-50/50 font-medium transition-all group cursor-pointer"
                    >
                      <td className="py-5 px-8 text-slate-300 text-center text-[10px] font-black group-hover:text-sky-500 transition-colors">#{String(lead.id).padStart(4, '0')}</td>
                      <td className="py-5 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border shadow-xs ${
                          lead.status === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}>
                          {lead.status === 'Ativo' ? '● Ativo' : '● Inativo'}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">{lead.etapa || 'Novo'}</span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-black group-hover:text-sky-700 transition-colors">{lead.nome || '—'}</span>
                          <span className="text-[11px] text-slate-400 font-bold">{lead.telefone || '—'}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-slate-600 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">{lead.user?.nome || '???'}</span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-sky-500 leading-none mb-1">{lead.canal || 'N/D'}</span>
                          <span className="text-xs font-bold text-slate-500 leading-none">{lead.origem || 'N/D'}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        {lead.plantaPath ? (
                          <a 
                            href={`http://localhost:3002/${lead.plantaPath}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex p-2 text-sky-500 hover:bg-white border border-transparent hover:border-sky-100 rounded-xl transition-all shadow-sm active:scale-90"
                          >
                            <FileUp size={18} />
                          </a>
                        ) : (
                          <span className="text-slate-200 text-xs font-black">—</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-slate-500 text-xs font-medium">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-5 px-8 text-slate-400 text-xs font-medium text-right">{timeAgo(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

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

      <LeadDetailsDrawer
        isOpen={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
