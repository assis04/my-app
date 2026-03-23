import { useState, useEffect } from 'react';
import { Loader2, UserPlus, AlertTriangle, ChevronDown, FileText, Building2, UserCheck, Settings2, FileUp, Globe, Hash } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { api } from '@/services/api';

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
          const gerentes = resUsers.filter(u => 
            ['Gerente', 'GERENTE', 'ADM', 'Administrador'].includes(String(u.perfil))
          );
          setManagers(gerentes);
          
          // Guardar todos os usuários para listar responsáveis dinâmicos
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
  // Se a prop `sellers` existir (chamado no painel da fila), usamos ela.
  // Senão, usamos `allUsers` filtrado pela filial do formData e categoria "Vendedor".
  let renderSellers = [];
  if (sellers && sellers.length > 0) {
    renderSellers = sellers;
  } else {
    renderSellers = allUsers.filter(u => 
      String(u.perfil).toLowerCase() === 'vendedor' && 
      (!formData.filialId || u.filialId === Number(formData.filialId))
    );
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    // Validação de formato (mínimo 10 dígitos)
    const digits = formData.telefone.replace(/\D/g, '');
    if (!digits) { 
      setError('O telefone é obrigatório.'); 
      return; 
    }
    if (digits.length < 10) {
      setError('O telefone deve ter pelo menos 10 dígitos (incluindo o DDD).');
      return;
    }

    if (!selectedAgentId) {
      setError('Selecione um responsável para o lead.');
      return;
    }

    if (!formData.filialId) {
      setError('Selecione uma filial para o lead.');
      return;
    }
    
    setLoading(true);

    try {
      // Usar FormData para suportar o arquivo de planta
      const data = new FormData();
      data.append('branch_id', formData.filialId);
      data.append('assigned_user_id', selectedAgentId);
      data.append('nome', formData.nome);
      data.append('telefone', formData.telefone);
      data.append('etapa', formData.etapa);
      data.append('status', formData.status);
      data.append('tipoImovel', formData.tipoImovel);
      data.append('statusImovel', formData.statusImovel);
      
      // Novos campos de MKT
      data.append('canal', formData.canal);
      data.append('origem', formData.origem);
      data.append('parceria', formData.parceria);

      if (selectedGerenteId) {
        data.append('gerenteId', selectedGerenteId);
      }
      
      if (plantaFile) {
        data.append('planta', plantaFile);
      }

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err || 'Erro ao atribuir lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-3 text-zinc-100">
            <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
              <UserPlus size={18} className="text-[#0ea5e9]" />
            </div>
            Novo Cadastro de Lead
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors hover:bg-zinc-800 p-1.5 rounded-full cursor-pointer text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Seção 1: Dados Essenciais */}
          <h3 className="text-[#0ea5e9] font-medium text-sm flex items-center gap-2 border-b border-zinc-800 pb-2">
            <UserCheck size={16} /> 1. Informações de Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <FileText size={14} /> Nome do Lead *
              </label>
              <input
                required 
                type="text" 
                placeholder="Ex: João Silva"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Hash size={14} /> Telefone *
              </label>
              <input
                required 
                type="text" 
                placeholder="(xx) xxxxx-xxxx"
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm"
                value={formData.telefone}
                onChange={e => setFormData(p => ({ ...p, telefone: formatPhone(e.target.value) }))}
              />
            </div>
          </div>

          {/* Seção 2: Atribuição Organizacional */}
          <h3 className="text-[#0ea5e9] font-medium text-sm flex items-center gap-2 border-b border-zinc-800 pb-2 mt-4">
            <Building2 size={16} /> 2. Atribuição do Lead
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Filial de Destino *
              </label>
              <div className="relative">
                <select
                  required
                  disabled={!!branchId && sellers.length > 0} // Trava se foi forçado pelo dashboard da Fila
                  value={formData.filialId}
                  onChange={handleBranchChange}
                  className="appearance-none w-full bg-[#242424] disabled:opacity-50 text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="" disabled>Selecione a Filial</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Responsável *
              </label>
              <div className="relative">
                <select
                  required
                  value={selectedAgentId || ''}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="" disabled>Selecione o vendedor...</option>
                  {renderSellers.map(seller => (
                    <option key={seller.id} value={seller.id} disabled={seller.isAvailable === false}>
                      {seller.nome} {seller.isAvailable === false ? '(Off)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Gerente (Opcional)
              </label>
              <div className="relative">
                <select
                  value={selectedGerenteId}
                  onChange={(e) => setSelectedGerenteId(e.target.value)}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="">Nenhum gerente</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.nome} ({m.perfil})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Seção 3: Desempenho (Marketing e Tracking) */}
          <h3 className="text-[#0ea5e9] font-medium text-sm flex items-center gap-2 border-b border-zinc-800 pb-2 mt-4">
            <Globe size={16} /> 3. Fonte e Origem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Canal
              </label>
              <div className="relative">
                <select
                  value={formData.canal}
                  onChange={(e) => setFormData(p => ({ ...p, canal: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="">Escolha um canal...</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Presencial">Presencial</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Origem
              </label>
              <div className="relative">
                <select
                  value={formData.origem}
                  onChange={(e) => setFormData(p => ({ ...p, origem: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="">Escolha uma origem...</option>
                  <option value="Site">Website Oficial</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Redes Sociais">Redes Sociais (Meta/TikTok)</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Offline">Offline / Passante</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Parceria (Corretor Terceiro?)
              </label>
              <div className="relative">
                <select
                  value={formData.parceria}
                  onChange={(e) => setFormData(p => ({ ...p, parceria: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Seção 4: Etapa e Status do Lead */}
          <h3 className="text-[#0ea5e9] font-medium text-sm flex items-center gap-2 border-b border-zinc-800 pb-2 mt-4">
            <Settings2 size={16} /> 4. Fluxo e Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Etapa
              </label>
              <div className="relative">
                <select
                  value={formData.etapa}
                  onChange={(e) => setFormData(p => ({ ...p, etapa: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="Novo">Novo</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Aguardando Documentação">Aguardando Documentação</option>
                  <option value="Proposta Feita">Proposta Feita</option>
                  <option value="Fechado">Fechado</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                Status no Sistema
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="Ativo">🟢 Ativo</option>
                  <option value="Desativado">🔴 Desativado</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Seção 5: Informações Extras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                 Tipo de Imóvel Buscado
              </label>
              <input
                type="text" 
                placeholder="Ex: Apartamento, Casa de Praia..."
                className="w-full bg-[#242424] text-white p-3 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm"
                value={formData.tipoImovel}
                onChange={e => setFormData(p => ({ ...p, tipoImovel: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                 Status do Imóvel Preferencial
              </label>
              <div className="relative">
                <select
                  value={formData.statusImovel}
                  onChange={(e) => setFormData(p => ({ ...p, statusImovel: e.target.value }))}
                  className="appearance-none w-full bg-[#242424] text-white p-3 pr-10 rounded-xl border border-zinc-700 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/50 transition-all text-sm cursor-pointer"
                >
                  <option value="Pronto">Pronto</option>
                  <option value="Reforma">Em Reforma</option>
                  <option value="Em Construção">Em Construção</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Planta do Imóvel (Upload) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <FileUp size={14} /> Arquivos Opcionais (Planta do Imóvel)
            </label>
            <div className="relative bg-[#242424] border-2 border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#0ea5e9]/50 transition-all cursor-pointer">
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => setPlantaFile(e.target.files[0])}
              />
              <FileUp size={24} className="text-zinc-500" />
              <p className="text-xs text-zinc-500 text-center">
                {plantaFile ? `Arquivo: ${plantaFile.name}` : 'Clique ou arraste o arquivo PDF, JPG ou PNG aqui'}
              </p>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-zinc-800 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 font-medium border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-sm">
            Cancelar
          </button>
          <button type="button" disabled={loading} onClick={handleSubmit}
            className="flex-1 bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white py-3 rounded-xl hover:opacity-90 transition-all font-bold shadow-lg shadow-sky-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Registrando Lead...</> : 'Criar e Atribuir Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
