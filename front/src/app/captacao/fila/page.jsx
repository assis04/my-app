'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, ChevronDown, FolderOpen, Menu } from 'lucide-react';
import { useSalesQueue } from '@/hooks/useSalesQueue';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Sidebar } from '@/components/ui/Sidebar';
import { useRouter } from 'next/navigation';
import NovoLeadModal from './components/NovoLeadModal';

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
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

  const { queue, history, loading: queueLoading, handleCreateManualLead, refetch } = useSalesQueue(selectedBranchId);

  const handlePhoneChange = (agentId, value) => {
    setPhoneInputs(prev => ({ ...prev, [agentId]: formatPhone(value) }));
  };

  const submitDirectLead = async (agentId, agentName, e) => {
    e.preventDefault();
    const phone = phoneInputs[agentId];
    if (!phone) return;
    
    // Instead of directly creating, open the Modal
    setModalData({
      initialPhone: phone,
      agentId,
      agentName,
      branchId: selectedBranchId
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
        <div className="mb-10 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h1 className="text-2xl font-light text-zinc-100">Fila da vez</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Atribuição e roteamento de leads</p>
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
                  <span className="text-zinc-500 whitespace-nowrap text-sm">Telefone:</span>
                  <form onSubmit={(e) => submitDirectLead(agent.id, agent.nome, e)} className="w-full sm:w-auto flex items-center">
                    <input 
                      type="text" 
                      placeholder={index === 0 ? "Novo lead (Enter)" : ""}
                      value={phoneInputs[agent.id] || ''}
                      onChange={(e) => handlePhoneChange(agent.id, e.target.value)}
                      disabled={!agent.isAvailable}
                      className="bg-[#2a2a2a] border border-zinc-700/80 rounded-xl h-10 px-4 w-full sm:w-64 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] text-zinc-200 text-sm disabled:opacity-50 transition-all"
                    />
                    <button type="submit" className="hidden">Submit</button>
                  </form>
                </div>

                <div className="flex-1 text-zinc-200 flex items-center justify-between font-medium">
                  <div className="flex items-center gap-3">
                    {agent.nome}
                    {!agent.isAvailable ? (
                      <span className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Off</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                    )}
                  </div>
                  
                  {user?.id === agent.id && (
                     <button 
                       onClick={() => {
                         api('/api/captacao/queue/toggle-status', { method: 'PUT', body: { branch_id: selectedBranchId, is_available: !agent.isAvailable } })
                           .then(() => refetch())
                           .catch(err => alert("Erro ao mudar status: " + err.message));
                       }}
                       className="text-xs text-[#0ea5e9] underline hover:text-white"
                     >
                       Alternar Meu Status
                     </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔹 HISTÓRICO DE ATENDIMENTO SECTION */}
        <div className="max-w-5xl mx-auto bg-[#1c1c1c] border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-300 mb-6 flex items-center gap-3">
            <FolderOpen size={20} className="text-[#0ea5e9]" /> Histórico de Relacionamento
          </h2>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <input 
                  type="text" 
                  placeholder="Faça uma busca..."
                  className="w-full bg-[#2a2a2a] text-sm text-zinc-200 pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all placeholder:text-zinc-600"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
              
              <button className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm whitespace-nowrap px-3 py-2 rounded-xl hover:bg-zinc-800">
                <Filter size={16} />
                Filtro
              </button>
            </div>
            
            <button className="flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white px-5 py-2.5 rounded-full hover:opacity-90 font-medium shadow-lg shadow-sky-900/20 transition-all text-sm">
              Novo Lead Manual <Plus size={16} />
            </button>
          </div>

          {/* DATA TABLE */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap text-zinc-400 border-collapse">
              <thead className="border-b border-zinc-800 text-zinc-100">
                <tr>
                  <th className="pb-4 pt-2 font-semibold px-2 w-12 text-center"></th>
                  <th className="pb-4 pt-2 font-semibold px-2 w-24">ID</th>
                  <th className="pb-4 pt-2 font-semibold px-2 w-32">Pedido</th>
                  <th className="pb-4 pt-2 font-semibold px-2 min-w-[200px]">Nome</th>
                  <th className="pb-4 pt-2 font-semibold px-2 min-w-[200px]">Vendedor</th>
                  <th className="pb-4 pt-2 font-semibold px-2 w-40">Origem</th>
                  <th className="pb-4 pt-2 font-semibold px-2 w-32">Tipo</th>
                  <th className="pb-4 pt-2 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-2 text-zinc-500 text-center flex justify-center"><FolderOpen size={16} /></td>
                    <td className="py-4 px-2 text-zinc-300 font-medium">#{lead.id}</td>
                    <td className="py-4 px-2 text-zinc-400">{lead.id ? lead.id + 11500 : ''}</td>
                    <td className="py-4 px-2 text-zinc-200">{lead.nome || lead.telefone}</td>
                    <td className="py-4 px-2">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
                        {lead.user?.nome || '???'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-zinc-400">CRM Interno</td>
                    <td className="py-4 px-2 text-zinc-400">Captação</td>
                    <td className="py-4 px-2"></td>
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
          onClose={() => setIsModalOpen(false)}
          onSave={async (leadData) => {
            // This will throw if the API call fails, and the modal will catch and display it
            await handleCreateManualLead(leadData);
            setPhoneInputs(prev => ({ ...prev, [modalData.agentId]: '' }));
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
