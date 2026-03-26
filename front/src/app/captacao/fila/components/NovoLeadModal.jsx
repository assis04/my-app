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
    telefone: initialPhone,
    etapa: 'Novo',
    status: 'Ativo',
    tipoImovel: '',
    statusImovel: 'Pronto',
    canal: '',
    origem: '',
    filialId: branchId || '', // Inicia com a branch passada (se houver)
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
          api('/users'),
          api('/filiais')
        ]);
        
        if (Array.isArray(resUsers)) {
          // Extrair Gerentes
          const gerentes = resUsers
            .filter(u => ['Gerente', 'GERENTE', 'ADM', 'Administrador'].includes(String(u.perfil)))
            .map(u => ({ id: u.id, nome: `${u.nome} (${u.perfil})` }));
          setManagers(gerentes);
          setAllUsers(resUsers);
        }

        if (Array.isArray(resBranches)) {
          setBranches(resBranches);
        }
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
      data.append('telefone', formData.telefone);
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
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 w-full max-w-4xl rounded-3xl shadow-floating flex flex-col max-h-[92vh] overflow-hidden translate-y-0 transform transition-all page-transition">

        {/* Header */}
        <div className="flex justify-between items-center p-8 border-b border-slate-100 shrink-0 bg-white">
          <h2 className="text-2xl font-black flex items-center gap-4 text-slate-900 tracking-tight">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 shadow-sm shadow-sky-900/5">
              <UserPlus size={24} className="text-sky-600" />
            </div>
            Novo Lead
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 p-2.5 rounded-full cursor-pointer active:scale-90 border border-transparent hover:border-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-8 overflow-y-auto space-y-10 custom-scrollbar">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          {/* Seção 1: Dados Essenciais */}
          <div className="space-y-6">
            <h3 className="text-sky-600 font-bold text-xs flex items-center gap-3 bg-sky-50 w-fit px-3 py-1 rounded-lg border border-sky-100">
              <UserCheck size={14} /> 1. Identificação do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 px-1">
                  <FileText size={12} /> Nome Completo *
                </label>
                <input
                  required 
                  type="text" 
                  placeholder="Nome do cliente..."
                  className="premium-input p-4 text-sm"
                  value={formData.nome}
                  onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 px-1">
                  <Hash size={12} /> Telefone Principal *
                </label>
                <input
                  required 
                  type="text" 
                  placeholder="(00) 00000-0000"
                  className="premium-input p-4 text-sm"
                  value={formData.telefone}
                  onChange={e => setFormData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Atribuição Organizacional */}
          <div className="space-y-6">
            <h3 className="text-sky-600 font-bold text-xs flex items-center gap-3 bg-sky-50 w-fit px-3 py-1 rounded-lg border border-sky-100">
              <Building2 size={14} /> 2. Roteamento de Venda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Filial de Destino *</label>
                <PremiumSelect 
                  placeholder="Selecione a Filial"
                  options={branches}
                  value={formData.filialId}
                  onChange={handleBranchChange}
                  className={branchId && sellers.length > 0 ? 'opacity-50 pointer-events-none' : ''}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Vendedor *</label>
 Sexton
                <PremiumSelect 
                  placeholder="Escolha o vendedor..."
                  options={renderSellers}
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Gerente Direto</label>
                <PremiumSelect 
                  placeholder="Sem gerente específico"
                  options={managers}
                  value={selectedGerenteId}
                  onChange={(e) => setSelectedGerenteId(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Seção 3: Marketing e Origem */}
          <div className="space-y-6">
            <h3 className="text-sky-600 font-bold text-xs flex items-center gap-3 bg-sky-50 w-fit px-3 py-1 rounded-lg border border-sky-100">
              <Globe size={14} /> 3. Marketing & Origem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Canal de Entrada</label>
                <PremiumSelect 
                  placeholder="Escolha um canal..."
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Fonte / Origem</label>
                <PremiumSelect 
                  placeholder="Escolha uma origem..."
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Parceria Terceira</label>
                <PremiumSelect 
                  options={[
                    { id: 'Não', nome: 'Não (Venda Direta)' },
                    { id: 'Sim', nome: 'Sim (Atendimento Externo)' }
                  ]}
                  value={formData.parceria}
                  onChange={(e) => setFormData(p => ({ ...p, parceria: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Sistema e Etapa */}
          <div className="space-y-6">
            <h3 className="text-sky-600 font-bold text-xs flex items-center gap-3 bg-sky-50 w-fit px-3 py-1 rounded-lg border border-sky-100">
              <Settings2 size={14} /> 4. Status de CRM
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Etapa do Funil</label>
                <PremiumSelect 
                  options={[
                    { id: 'Novo', nome: 'Novo' },
                    { id: 'Em Atendimento', nome: 'Em Atendimento' },
                    { id: 'Proposta', nome: 'Proposta Enviada' },
                    { id: 'Fechado', nome: 'Negócio Fechado' }
                  ]}
                  value={formData.etapa}
                  onChange={(e) => setFormData(p => ({ ...p, etapa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Status Vital</label>
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
          <div className="space-y-6">
             <h3 className="text-sky-600 font-bold text-xs flex items-center gap-3 bg-sky-50 w-fit px-3 py-1 rounded-lg border border-sky-100">
              <Building2 size={14} /> 5. Preferências de Ativo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Tipo de Imóvel</label>
                <input
                  type="text" 
                  placeholder="Ex: Apartamento, Casa..."
                  className="premium-input p-4 text-sm"
                  value={formData.tipoImovel}
                  onChange={e => setFormData(p => ({ ...p, tipoImovel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 px-1">Status Preferencial</label>
                <PremiumSelect 
                  options={[
                    { id: 'Pronto', nome: 'Pronto para Morar' },
                    { id: 'Reforma', nome: 'Em Reforma / Repasse' },
                    { id: 'Planta', nome: 'Na Planta / Lançamento' }
                  ]}
                  value={formData.statusImovel}
                  onChange={(e) => setFormData(p => ({ ...p, statusImovel: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <FileUp size={12} className="text-sky-500" /> Documentação Auxiliar (Opcional)
            </label>
            <div className="relative group bg-slate-50 border-2 border-dashed border-slate-200 rounded-[28px] p-10 flex flex-col items-center justify-center gap-3 hover:border-sky-400 hover:bg-sky-50/50 transition-all cursor-pointer shadow-inner overflow-hidden">
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={e => setPlantaFile(e.target.files[0])}
              />
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <FileUp size={28} className="text-sky-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-700">
                  {plantaFile ? plantaFile.name : 'Arquivar Planta Digital'}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  PDF, JPG OU PNG (MÁX 10MB)
                </p>
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex gap-4 p-8 border-t border-slate-100 bg-white shadow-inner shrink-0 relative z-20 font-sans">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-bold text-xs text-slate-400 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-sm">
            Descartar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-2 bg-linear-to-r from-sky-500 to-sky-600 text-white py-3 rounded-2xl hover:shadow-sky-500/40 hover:shadow-2xl hover:-translate-y-0.5 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-xl shadow-sky-900/10 active:scale-95">
            {loading ? <><Loader2 size={18} className="animate-spin" /> Sincronizando...</> : 'Confirmar e Sincronizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
