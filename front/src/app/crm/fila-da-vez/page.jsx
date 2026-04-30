'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FolderOpen, X, FileUp, Edit, RefreshCw, Calendar } from 'lucide-react';
import { useSalesQueue } from '@/hooks/useSalesQueue';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/roles';
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
  const [filterData, setFilterData] = useState('');

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
    const isAdm = isAdmin(user);
    const isGerente = ['Gerente', 'GERENTE'].includes(user?.role);
    const sameBranch = Number(user?.filialId) === Number(selectedBranchId);
    return isAdm || (isGerente && sameBranch);
  }, [user, selectedBranchId]);

  const uniqueVendedores = useMemo(() => {
    const map = new Map();
    history.forEach(lead => {
      const responsavel = lead.vendedor || lead.user;
      if (responsavel?.id && responsavel?.nome) {
        map.set(String(responsavel.id), responsavel.nome);
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
        ((lead.celular || lead.telefone) && (lead.celular || lead.telefone).includes(term)) ||
        ((lead.vendedor || lead.user)?.nome && (lead.vendedor || lead.user).nome.toLowerCase().includes(term)) ||
        (String(lead.id).includes(term))
      );
    }
    if (filterVendedor) {
      items = items.filter(lead => String(lead.user?.id) === filterVendedor);
    }
    if (filterData) {
      const targetDate = new Date(filterData + 'T23:59:59'); // Garantir final do dia para a comparação
      const startOfDay = new Date(filterData + 'T00:00:00');
      items = items.filter(lead => {
        if (!lead.createdAt) return false;
        const leadDate = new Date(lead.createdAt);
        return leadDate >= startOfDay && leadDate <= targetDate;
      });
    } else if (filterPeriodo !== 'todos') {
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
  }, [history, searchTerm, filterVendedor, filterPeriodo, filterData]);

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
      <div key={agent.id} className="flex flex-col sm:flex-row sm:items-center py-0.5 border-b border-slate-50 last:border-0 gap-2 sm:gap-0 transition-all hover:bg-slate-50/80 px-3 rounded-xl group">
        <span className="w-8 text-slate-300 font-black text-base italic tracking-tight group-hover:text-sky-400 transition-colors">
          {String(index + 1).padStart(2, '0')}
        </span>
        
        <div className="flex items-center gap-2 flex-1">
          <span className="text-slate-400 whitespace-nowrap text-xs font-black tracking-tight italic">Atribuir:</span>
          <form onSubmit={(e) => submitDirectLead(agent.id, agent.nome, e)} className="w-full sm:w-auto flex items-center relative">
            <input 
              type="text" 
              placeholder={agent.isAvailable && index === firstAvailableIndex ? "Tel..." : ""}
              value={phoneInputs[agent.id] || ''}
              onChange={(e) => handlePhoneChange(agent.id, e.target.value)}
              disabled={!agent.isAvailable}
              className="bg-white border border-slate-200 rounded-xl h-7 px-3 w-full sm:w-64 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 text-slate-900 text-sm disabled:opacity-50 disabled:bg-slate-100 transition-all font-bold placeholder:text-slate-300 shadow-xs"
            />
            {agent.isAvailable && index === firstAvailableIndex && !phoneInputs[agent.id] && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-100 text-sky-600 px-1 py-0.5 rounded text-xs font-black pointer-events-none">OK</div>
            )}
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>

        <div className="flex-1 text-slate-900 flex items-center justify-between pl-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-black text-base text-slate-900 group-hover:text-sky-700 transition-colors leading-tight tracking-tight">{agent.nome}</span>
              <span className="text-xs font-bold text-slate-400 leading-none mt-0 italic tracking-tight">Vendedor</span>
            </div>
            {!agent.isAvailable ? (
              <span className="text-xs font-black text-rose-600 border border-rose-100 bg-rose-50 px-1.5 py-0.5 rounded-full shadow-xs">Ausente</span>
            ) : agent.isAvailable && index === firstAvailableIndex ? (
              <span className="text-xs font-black text-emerald-600 border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 rounded-full shadow-xs">Na Vez</span>
            ) : (
              <span className="text-xs font-black text-sky-400 border border-sky-100 bg-sky-50 px-1.5 py-0.5 rounded-full shadow-xs tracking-tight">Livre</span>
            )}
          </div>
          
          {(user?.id === agent.id || canToggleOthers) && (
             <button 
               onClick={() => {
                 handleToggleAgentStatus(agent.id, !agent.isAvailable)
                   .catch(err => alert(err.message || "Erro ao mudar status"));
               }}
               className="text-xs font-black tracking-tight text-sky-600 hover:text-white hover:bg-sky-600 px-2.5 py-1 rounded-xl border border-sky-100 bg-sky-50 transition-all shadow-xs active:scale-95 whitespace-nowrap"
             >
               {user?.id === agent.id ? 'Meu Status' : 'Trocar'}
             </button>
          )}
        </div>
      </div>
    ));
  }, [queue, firstAvailableIndex, phoneInputs, user, canToggleOthers, handleToggleAgentStatus, submitDirectLead, handlePhoneChange]);

  if (authLoading) return null;

  return (
    <>
        <div className="mb-4 max-w-[1600px] mx-auto">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-slate-200 pb-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Fila da Vez</h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={refetch}
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-transparent hover:border-sky-100 shadow-sm active:scale-95"
                title="Sincronizar Fila"
              >
                <RefreshCw size={16} className={queueLoading ? 'animate-spin' : ''} />
              </button>
              <div className="w-44 sm:w-56">
                <PremiumSelect
                placeholder="Unidade"
                options={branches}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!isAdmOrSupervisor}
              />
            </div>
          </div>
        </div>

          <div className="w-full relative glass-card border border-white/60 rounded-3xl p-1 shadow-floating overflow-hidden transition-all bg-white/40 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
            
            {queueLoading && queue.length === 0 && (
               <div className="text-slate-400 py-3 opacity-70 flex items-center justify-center font-black text-xs animate-pulse">
                 Sincronizando...
               </div>
            )}
            {queue.length === 0 && !queueLoading && (
               <div className="text-slate-400 py-4 text-center font-black text-xs italic">Vazio.</div>
            )}
            
            <div className="space-y-0">
              {RenderedQueue}
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto glass-card border border-white/60 rounded-3xl p-4 shadow-floating mb-2 bg-white/40 backdrop-blur-xl">
          <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2 tracking-tight">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
              <FolderOpen size={18} className="text-sky-500" />
            </div>
            Histórico de atendimento
          </h2>
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full xl:w-auto">
              
              <div className="relative group min-w-[240px]">
                <input 
                  type="text" 
                  placeholder="Localizar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white text-sm text-slate-900 pl-9 pr-4 h-9 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/5 outline-none transition-all placeholder:text-slate-300 font-bold shadow-xs tracking-tight"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              
              <PremiumSelect 
                placeholder="Período"
                options={[
                  { id: 'hoje', nome: 'Hoje' },
                  { id: '7d', nome: '7 dias' },
                  { id: '30d', nome: '30 dias' },
                  { id: 'todos', nome: 'Tudo' }
                ]}
                value={filterPeriodo}
                onChange={(e) => setFilterPeriodo(e.target.value)}
              />

              <PremiumSelect 
                placeholder="Vendedor"
                options={uniqueVendedores}
                value={filterVendedor}
                onChange={(e) => setFilterVendedor(e.target.value)}
              />

              <div className="relative flex items-center gap-2">
                <div className={`flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-1 h-9 shadow-xs transition-all w-full ${filterData ? 'ring-2 ring-sky-500/20 border-sky-200' : ''}`}>
                  <div className="pl-3 text-slate-400">
                    <Calendar size={14} />
                  </div>
                  <input 
                    type="date" 
                    value={filterData}
                    onChange={(e) => setFilterData(e.target.value)}
                    className="bg-transparent text-sm text-slate-900 pr-2 py-0 outline-none font-bold cursor-pointer tracking-tight"
                  />
                  {filterData && (
                    <button 
                      onClick={() => setFilterData('')}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors mr-1"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
              <div className="flex-col items-end mr-1 hidden xl:flex leading-none">
                <span className="text-xs text-slate-300 font-black tracking-tight italic leading-none">Unidade</span>
                <span className="text-xs font-black text-sky-500 tracking-tight leading-none mt-0.5">
                  {branches.find(b => String(b.id) === String(selectedBranchId))?.nome || 'GLOBAL'}
                </span>
              </div>

              <button 
                onClick={openNewLeadModal}
                className="flex items-center gap-2 bg-linear-to-r from-sky-500 to-sky-600 text-white px-4 py-2 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl font-black shadow-xl shadow-sky-900/10 transition-all text-xs active:scale-95 whitespace-nowrap tracking-tight"
              >
                Novo 
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
                <thead className="bg-slate-50/50 text-slate-400 font-black text-xs tracking-tight italic border-b border-slate-100">
                  <tr>
                    <th className="py-2 px-4 text-center w-[50px]">ID</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Etapa</th>
                    <th className="py-2 px-3">Lead / Cliente</th>
                    <th className="py-2 px-3">Responsável</th>
                    <th className="py-2 px-3">Origem / Canal</th>
                    <th className="py-2 px-3 text-center">Docs</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-4 text-right">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-100 text-slate-200">
                           <FolderOpen size={20} />
                        </div>
                        <p className="text-slate-300 font-black text-xs">Sem registros.</p>
                      </td>
                    </tr>
                  )}
                  {filteredHistory.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-sky-50/40 transition-all group cursor-pointer"
                    >
                      <td className="py-1.5 px-4 text-slate-300 text-center text-xs font-black group-hover:text-sky-500 italic transition-colors">#{String(lead.id).padStart(4, '0')}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black border shadow-xs tracking-tight ${
                          lead.status === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                        }`}>
                          {lead.status === 'Ativo' ? '● Ativo' : '● Inativo'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-xs font-black text-sky-500 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100 tracking-tight">{lead.etapa || 'Novo'}</span>
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-900 text-sm font-black group-hover:text-sky-700 transition-colors tracking-tight truncate max-w-[150px]">{lead.nome || '—'}</span>
                          <span className="text-xs text-slate-400 font-bold tracking-tight">{lead.celular || lead.telefone || '—'}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-slate-400 text-xs font-black bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 tracking-tight">{(lead.vendedor || lead.user)?.nome || '???'}</span>
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex flex-col leading-none">
                          <span className="text-xs font-black text-sky-400 tracking-tight italic">{lead.canal || 'N/D'}</span>
                          <span className="text-xs font-bold text-slate-400 tracking-tight">{lead.origem || '—'}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {lead.plantaPath ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/crm/leads/${lead.id}/planta`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 text-sky-400 hover:text-sky-600 transition-all active:scale-90"
                          >
                            <FileUp size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-100 text-xs font-black">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400 text-xs font-black tracking-tight italic">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-1.5 px-4 text-slate-300 text-xs font-black text-right italic tracking-tight">{timeAgo(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
    </>
  );
}
