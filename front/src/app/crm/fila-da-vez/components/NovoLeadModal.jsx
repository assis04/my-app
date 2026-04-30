import { useState, useEffect } from 'react';
import { Loader2, UserPlus, AlertTriangle, FileText, Building2, UserCheck, Settings2, FileUp, Globe, Hash, X } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { api } from '@/services/api';
import PremiumSelect from '@/components/ui/PremiumSelect';

export default function NovoLeadModal({ 
  initialPhone = '', 
  agentId = null, 
  agentName = '', 
  branchId = null,
  branchName = '',
  sellers = [],   // lista de vendedores da fila (opcional)
  onClose, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    telefone: initialPhone,
    cep: '',
    etapa: 'Novo',
    status: 'Ativo',
    tipoImovel: '',
    statusImovel: 'Pronto',
    canal: '',
    origem: '',
    filialId: branchId || '',
    parceria: 'Não',
  });

  const [plantaFile, setPlantaFile] = useState(null);
  const [managers, setManagers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  
  const [selectedGerenteId, setSelectedGerenteId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(agentId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carregar listas genéricas (Gerentes, Filiais, Todos os Usuários)
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [resUsers, resBranches] = await Promise.all([
          api('/users/lookup'),
          api('/filiais')
        ]);

        const usersList = Array.isArray(resUsers) ? resUsers : (resUsers?.data ?? []);
        const gerentes = usersList
          .filter(u => ['Gerente', 'GERENTE', 'ADM', 'Administrador'].includes(String(u.perfil)))
          .map(u => ({ id: u.id, nome: `${u.nome} (${u.perfil})` }));
        setManagers(gerentes);
        setAllUsers(usersList);

        const branchesList = resBranches?.data ?? (Array.isArray(resBranches) ? resBranches : []);
        setBranches(branchesList);
      } catch (err) {
        console.error('Erro ao carregar dados no Modal:', err);
      }
    }
    fetchInitialData();
  }, []);

  // Quando a filial for alterada pelo usuário no form, limpamos o agente selecionado para evitar incompatibilidade
  const handleBranchChange = (e) => {
    setFormData(p => ({ ...p, filialId: e.target.value }));
    setSelectedAgentId('');
  };

  // Determinar quais responsáveis listar
  let renderSellers = [];
  if (sellers && sellers.length > 0) {
    renderSellers = sellers.map(s => ({ id: s.id, nome: s.isAvailable === false ? `${s.nome} (Off)` : s.nome }));
  } else {
    renderSellers = allUsers
      .filter(u => String(u.perfil).toLowerCase() === 'vendedor' && (!formData.filialId || u.filialId === Number(formData.filialId)))
      .map(u => ({ id: u.id, nome: u.nome }));
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    // Validação de formato (mínimo 10 dígitos)
    const digits = formData.telefone.replace(/\D/g, '');
    if (!digits) { setError('O telefone é obrigatório.'); return; }
    if (digits.length < 10) { setError('O telefone deve ter pelo menos 10 dígitos (incluindo o DDD).'); return; }
    if (!selectedAgentId) { setError('Selecione um responsável para o lead.'); return; }
    if (!formData.filialId) { setError('Selecione uma filial para o lead.'); return; }
    
    setLoading(true);

    try {
      const data = new FormData();
      data.append('branch_id', formData.filialId);
      data.append('assigned_user_id', selectedAgentId);
      data.append('nome', formData.nome);
      data.append('sobrenome', formData.sobrenome);
      data.append('telefone', formData.telefone);
      data.append('cep', formData.cep);
      data.append('etapa', formData.etapa);
      data.append('status', formData.status);
      data.append('tipoImovel', formData.tipoImovel);
      data.append('statusImovel', formData.statusImovel);
      data.append('canal', formData.canal);
      data.append('origem', formData.origem);
      data.append('parceria', formData.parceria);

      if (selectedGerenteId) { data.append('gerenteId', selectedGerenteId); }
      if (plantaFile) { data.append('planta', plantaFile); }

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err || 'Erro ao atribuir lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 w-full max-w-4xl rounded-3xl shadow-floating flex flex-col max-h-[95vh] overflow-hidden translate-y-0 transform transition-all page-transition">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-50 shrink-0 bg-white">
          <h2 className="text-lg font-black flex items-center gap-3 text-slate-900 tracking-tight">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
              <UserPlus size={18} className="text-sky-500" />
            </div>
            Novo Lead
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 p-2 rounded-xl cursor-pointer active:scale-90 border border-transparent hover:border-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-2xl text-sm flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          {/* Seção 1: Dados Essenciais */}
          <div className="space-y-3">
            <h3 className="text-sky-600 font-black text-xs tracking-tight flex items-center gap-2 px-1">
              <UserCheck size={12} className="text-sky-400" /> Identificação do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 flex items-center gap-2 px-1 tracking-tight">
                  Nome *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nome..."
                  className="premium-input h-9 px-4 text-base bg-white"
                  value={formData.nome}
                  onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 flex items-center gap-2 px-1 tracking-tight">
                  Sobrenome
                </label>
                <input
                  type="text"
                  placeholder="Sobrenome..."
                  className="premium-input h-9 px-4 text-base bg-white"
                  value={formData.sobrenome}
                  onChange={e => setFormData(p => ({ ...p, sobrenome: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 flex items-center gap-2 px-1 tracking-tight">
                  Celular *
                </label>
                <input
                  required
                  type="text"
                  placeholder="(00) 00000-0000"
                  className="premium-input h-9 px-4 text-base bg-white"
                  value={formData.telefone}
                  onChange={e => setFormData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 flex items-center gap-2 px-1 tracking-tight">
                  CEP *
                </label>
                <input
                  required
                  type="text"
                  placeholder="00000-000"
                  className="premium-input h-9 px-4 text-base bg-white"
                  maxLength={9}
                  value={formData.cep}
                  onChange={e => setFormData(p => ({ ...p, cep: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Atribuição Organizacional */}
          <div className="space-y-3">
            <h3 className="text-sky-600 font-black text-xs tracking-tight flex items-center gap-2 px-1">
              <Building2 size={12} className="text-sky-400" /> Roteamento de Venda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Filial *</label>
                <PremiumSelect 
                  placeholder="Filial"
                  options={branches}
                  value={formData.filialId}
                  onChange={handleBranchChange}
                  className={branchId && sellers.length > 0 ? 'opacity-50 pointer-events-none' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Vendedor *</label>
                <PremiumSelect 
                  placeholder="Escolha..."
                  options={renderSellers}
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Gerente</label>
                <PremiumSelect 
                  placeholder="Nenhum"
                  options={managers}
                  value={selectedGerenteId}
                  onChange={(e) => setSelectedGerenteId(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Seção 3: Marketing e Origem */}
          <div className="space-y-3">
            <h3 className="text-sky-600 font-black text-xs tracking-tight flex items-center gap-2 px-1">
              <Globe size={12} className="text-sky-400" /> Marketing & Origem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Canal</label>
                <PremiumSelect 
                  placeholder="Canal..."
                  options={[
                    { id: 'WhatsApp', nome: 'WhatsApp' },
                    { id: 'Email', nome: 'Email' },
                    { id: 'Telefone', nome: 'Telefone' },
                    { id: 'Presencial', nome: 'Presencial' }
                  ]}
                  value={formData.canal}
                  onChange={(e) => setFormData(p => ({ ...p, canal: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Origem</label>
                <PremiumSelect 
                  placeholder="Origem..."
                  options={[
                    { id: 'Site', nome: 'Website Oficial' },
                    { id: 'Indicação', nome: 'Indicação' },
                    { id: 'Redes Sociais', nome: 'Redes Sociais (Ads)' },
                    { id: 'Google', nome: 'Google Ads / Search' },
                    { id: 'Offline', nome: 'Passante / Offline' }
                  ]}
                  value={formData.origem}
                  onChange={(e) => setFormData(p => ({ ...p, origem: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Parceria</label>
                <PremiumSelect 
                  options={[
                    { id: 'Não', nome: 'Venda Direta' },
                    { id: 'Sim', nome: 'Atendimento Externo' }
                  ]}
                  value={formData.parceria}
                  onChange={(e) => setFormData(p => ({ ...p, parceria: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Sistema e Etapa */}
          <div className="space-y-3">
            <h3 className="text-sky-600 font-black text-xs tracking-tight flex items-center gap-2 px-1">
              <Settings2 size={12} className="text-sky-400" /> Status de CRM
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Etapa do Funil</label>
                <PremiumSelect 
                  options={[
                    { id: 'Novo', nome: 'Novo' },
                    { id: 'Em Atendimento', nome: 'Em Atendimento' },
                    { id: 'Proposta', nome: 'Proposta' },
                    { id: 'Fechado', nome: 'Negócio Fechado' }
                  ]}
                  value={formData.etapa}
                  onChange={(e) => setFormData(p => ({ ...p, etapa: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Status Vital</label>
                <PremiumSelect 
                  options={[
                    { id: 'Ativo', nome: '🟢 ATIVO' },
                    { id: 'Desativado', nome: '🔴 DESATIVADO' }
                  ]}
                  value={formData.status}
                  onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Perfil de Interesse */}
          <div className="space-y-3">
             <h3 className="text-sky-600 font-black text-xs tracking-tight flex items-center gap-2 px-1">
              <Building2 size={12} className="text-sky-400" /> Preferências
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Tipo de Imóvel</label>
                <input
                  type="text" 
                  placeholder="Ex: Apartamento..."
                  className="premium-input h-9 px-4 text-base bg-white"
                  value={formData.tipoImovel}
                  onChange={e => setFormData(p => ({ ...p, tipoImovel: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 px-1 tracking-tight">Status Preferencial</label>
                <PremiumSelect 
                  options={[
                    { id: 'Pronto', nome: 'Pronto para Morar' },
                    { id: 'Reforma', nome: 'Reforma / Repasse' },
                    { id: 'Planta', nome: ' Planta / Lançamento' }
                  ]}
                  value={formData.statusImovel}
                  onChange={(e) => setFormData(p => ({ ...p, statusImovel: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 tracking-tight flex items-center gap-2 px-1">
              <FileUp size={12} className="text-sky-500" /> Planta (Opcional)
            </label>
            <div className="relative group bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:border-sky-400 hover:bg-sky-50/50 transition-all cursor-pointer overflow-hidden">
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={e => setPlantaFile(e.target.files[0])}
              />
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <FileUp size={16} className="text-sky-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-700 leading-tight">
                  {plantaFile ? plantaFile.name : 'Arquivar Planta'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 font-bold leading-none">
                  MÁX 10MB
                </p>
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex gap-4 p-4 border-t border-slate-100 bg-white shadow-inner shrink-0 relative z-20 font-sans">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 font-bold text-sm text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-sm">
            Descartar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-2 bg-linear-to-r from-sky-500 to-sky-600 text-white py-2 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-xl shadow-sky-900/10 active:scale-95 whitespace-nowrap"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sincronizando...</> : 'Confirmar e Sincronizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
