'use client';

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import {
  Search, Plus, RefreshCw, Edit, Trash2, ArrowRightLeft,
  X, Users, Download, Upload, Route,
  Save, Briefcase, Loader2, AlertTriangle,
  ArrowUp, ArrowDown, ArrowUpDown,
  MoreHorizontal, Phone, Copy, Check
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { getLeads, deleteLead, transferLeads, updateEtapaLote } from '@/services/crmApi';
import { formatPhone } from '@/lib/utils';
import PremiumSelect from '@/components/ui/PremiumSelect';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { isAdmin, isSeller } from '@/lib/roles';
import { useDebounce } from '@/hooks/useDebounce';
import { INITIAL_LEAD_FORM, ETAPA_OPTIONS, validateLeadForm } from '@/lib/leadConstants';
import { requiresAdminToEdit, STATUS_COLORS, STATUS_ORDER } from '@/lib/leadStatus';
import { CRM_PERMISSIONS, hasPermission } from '@/lib/permissions';
import LeadFormFields from '@/components/crm/LeadFormFields';
import TemperaturaButtons from '@/components/crm/TemperaturaButtons';
import StatusBar from '@/components/crm/StatusBar';
import LeadPreviewPane from './components/LeadPreviewPane';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';

// ── Modal Novo Lead ──────────────────────────────────────────────────────
function NovoLeadModal({ onClose, onSaved, sellers, user }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_LEAD_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSeller(user)) {
      setForm(prev => ({ ...prev, preVendedorId: String(user.id) }));
    }
  }, [user]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const submitLead = async () => {
    const validationError = validateLeadForm(form);
    if (validationError) { setError(validationError); return null; }

    setError('');
    setLoading(true);
    try {
      // status / etapa não vão no POST — backend força status canônico "Em prospecção"
      // e deriva etapa via STATUS_TO_ETAPA. Ver specs/crm.md §9.3 + leadValidator.js.
      const payload = {
        nome: form.nome,
        sobrenome: form.sobrenome,
        celular: form.celular,
        email: form.email,
        cep: form.cep,
        conjugeNome: form.conjugeNome,
        conjugeSobrenome: form.conjugeSobrenome,
        conjugeCelular: form.conjugeCelular,
        conjugeEmail: form.conjugeEmail,
        origemCanal: form.origemCanal,
        preVendedorId: form.preVendedorId || null,
      };
      const lead = await api('/api/crm/leads', { body: payload });
      return lead;
    } catch (err) {
      setError(err?.message || err || 'Erro ao criar lead.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const lead = await submitLead();
    if (lead) {
      onSaved();   // Fecha modal + refresh na tabela
    }
  };

  const handleSaveAndOportunidade = async () => {
    const lead = await submitLead();
    if (lead) {
      onClose();
      router.push(`/crm/oportunidade-de-negocio?leadId=${lead.id}`);
    }
  };

  const isVendedor = isSeller(user);
  const isAdm = isAdmin(user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-[780px] max-h-[90vh] overflow-y-auto border border-(--border-subtle) custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-(--border-subtle) sticky top-0 bg-(--surface-2) rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-black text-(--text-primary) tracking-tight">Novo Lead</h2>
            <p className="text-sm text-(--text-muted) font-bold mt-0.5">O vínculo com a Conta será feito automaticamente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-(--surface-3) rounded-xl text-(--text-muted) hover:text-(--text-primary) transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-(--danger-soft) border border-(--danger)/30 text-(--danger) p-3 rounded-2xl text-base flex items-start gap-2 shadow-sm animate-in slide-in-from-top-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <LeadFormFields
            form={form}
            onChange={handleChange}
            sellers={sellers}
            isVendedor={isVendedor}
            isAdm={isAdm}
            userName={user?.nome}
          />
        </div>

        {/* Footer do Modal */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 pt-4 border-t border-(--border-subtle) sticky bottom-0 bg-(--surface-2) rounded-b-3xl">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-base text-(--text-muted) border border-(--border) rounded-2xl hover:bg-(--surface-1) hover:text-(--text-primary) transition-all active:scale-95 shadow-sm tracking-tight">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl active:scale-95 tracking-tight">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Lead</>}
          </button>
          <button onClick={handleSaveAndOportunidade} disabled={loading} className="flex-1 bg-(--gold) text-(--on-gold) py-3 rounded-2xl  hover:shadow-2xl transition-all font-black text-base disabled:opacity-50 flex justify-center items-center gap-2 shadow-xl  active:scale-95 tracking-tight">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Briefcase size={14} /> Nova Oportunidade</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Transferir Responsável ──────────────────────────────────────────
function TransferModal({ onClose, onConfirm, sellers }) {
  const [selectedSeller, setSelectedSeller] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-sm mx-4 p-6 border border-(--border-subtle)" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-(--text-primary) tracking-tight">Transferir Responsável</h3>
          <button onClick={onClose} className="p-1 hover:bg-(--surface-3) rounded-xl text-(--text-muted)"><X size={16} /></button>
        </div>
        <PremiumSelect placeholder="Selecione o pré-vendedor..." options={sellers} value={selectedSeller} onChange={e => setSelectedSeller(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl text-base font-black text-(--text-secondary) hover:bg-(--surface-3) transition-all">Cancelar</button>
          <button onClick={() => { if (selectedSeller) onConfirm(selectedSeller); }} disabled={!selectedSeller} className="px-4 py-2 rounded-2xl text-base font-black text-(--on-gold) bg-(--gold) shadow-lg transition-all active:scale-95 disabled:opacity-50">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Definir Etapa ───────────────────────────────────────────────────
function EtapaModal({ onClose, onConfirm }) {
  const [selectedEtapa, setSelectedEtapa] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-(--surface-2) rounded-3xl shadow-floating w-full max-w-sm mx-4 p-6 border border-(--border-subtle)" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-(--text-primary) tracking-tight">Definir Nova Etapa</h3>
          <button onClick={onClose} className="p-1 hover:bg-(--surface-3) rounded-xl text-(--text-muted)"><X size={16} /></button>
        </div>
        <PremiumSelect placeholder="Selecione a etapa..." options={ETAPA_OPTIONS} value={selectedEtapa} onChange={e => setSelectedEtapa(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl text-base font-black text-(--text-secondary) hover:bg-(--surface-3) transition-all">Cancelar</button>
          <button onClick={() => { if (selectedEtapa) onConfirm(selectedEtapa); }} disabled={!selectedEtapa} className="px-4 py-2 rounded-2xl text-base font-black text-(--on-gold) bg-(--gold) shadow-lg transition-all active:scale-95 disabled:opacity-50">Aplicar</button>
        </div>
      </div>
    </div>
  );
}


// StatusBar (identidade Workshop) extraído em @/components/crm/StatusBar.
// Wrapper local resolve a palette do Lead pra simplificar callsites.
function LeadStatusBar({ status }) {
  return <StatusBar palette={STATUS_COLORS[status]} label={status} />;
}

// ── StatusTabs: navegação primária via chips segmented ────────────────────
// Substitui o dropdown de Status (que era 1-cliques-pra-abrir + 1 pra escolher).
// "Todos" é o estado neutro (sem filtro). Cada chip tem dot da cor canônica
// pra reconhecimento visual independente de leitura.
function StatusTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por status"
      className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
    >
      <StatusChip active={!value} onClick={() => onChange('')}>Todos</StatusChip>
      {STATUS_ORDER.map((s) => (
        <StatusChip
          key={s}
          active={value === s}
          dot={STATUS_COLORS[s]?.dot}
          onClick={() => onChange(s)}
        >
          {s}
        </StatusChip>
      ))}
    </div>
  );
}

// ── Sort: parse/serialize do URL param `?sort=field:dir` ──────────────────
// Formato compacto pra não poluir a URL com 2 keys (sort_by + sort_dir).
// Whitelist de campos espelha SORTABLE_FIELDS no backend (leadCrmService.js).
const SORTABLE = new Set(['createdAt', 'nome', 'status', 'temperatura']);

function parseSort(value) {
  if (!value) return null;
  const [field, dir] = String(value).split(':');
  if (!SORTABLE.has(field) || (dir !== 'asc' && dir !== 'desc')) return null;
  return { field, dir };
}

// ── SortableHeader: th clicável com toggle 3-state (none → asc → desc → none) ─
function SortableHeader({ field, currentSort, onSort, className = '', children }) {
  const isActive = currentSort?.field === field;
  const isAsc = isActive && currentSort.dir === 'asc';
  const isDesc = isActive && currentSort.dir === 'desc';
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 group/sort hover:text-(--text-primary) transition-colors"
      >
        <span>{children}</span>
        {isAsc && <ArrowUp size={11} className="text-(--gold)" />}
        {isDesc && <ArrowDown size={11} className="text-(--gold)" />}
        {!isActive && <ArrowUpDown size={11} className="opacity-0 group-hover/sort:opacity-50 transition-opacity" />}
      </button>
    </th>
  );
}

// ── LeadsTableSkeleton: placeholder estrutural durante load ───────────────
function Skel({ className = '' }) {
  return <span className={`block bg-(--surface-3) animate-pulse rounded ${className}`} />;
}

function LeadsTableSkeleton({ rows = 6 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={`skel-${i}`} className="border-b border-(--border-subtle)/50">
      <td className="py-3 px-3"><Skel className="w-3.5 h-3.5" /></td>
      <td className="py-3 px-3"><Skel className="w-4 h-4 rounded-full mx-auto" /></td>
      <td className="py-3 px-3 sticky left-0 bg-(--surface-2) z-10">
        <Skel className="h-3 w-28 mb-1.5" /><Skel className="h-2 w-10" />
      </td>
      <td className="py-3 px-3"><Skel className="h-3 w-24" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-20" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-20" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-24" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-20" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-16" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-14" /></td>
      <td className="py-3 px-3"><Skel className="h-3 w-14" /></td>
      <td className="py-3 px-4"><Skel className="h-3 w-10 ml-auto" /></td>
    </tr>
  ));
}

// ── EmptyState: copia depende de filtros ativos ───────────────────────────
function EmptyContent({ hasFilters, onClear }) {
  return (
    <div className="py-14 text-center">
      <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
        {hasFilters ? <Search size={18} /> : <Users size={18} />}
      </div>
      <p className="text-(--text-muted) text-sm font-medium mb-1">
        {hasFilters ? 'Nenhum lead corresponde aos filtros' : 'Nenhum lead cadastrado ainda.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="text-sm text-(--gold) hover:text-(--gold-hover) font-medium underline-offset-4 hover:underline">
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <tr><td colSpan={12}>
      <EmptyContent hasFilters={hasFilters} onClear={onClear} />
    </td></tr>
  );
}

// ── LeadCard: layout em card pra <md (substitui tabela em mobile) ─────────
function LeadCard({ lead, selected, onToggleSelect, tempLocked, onTempChange, onEdit, onTransfer, onChangeEtapa, onCreateOpportunity, onDelete }) {
  const router = useRouter();
  return (
    <div className="px-4 py-3.5 hover:bg-(--surface-1)/40 transition-colors">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 w-3.5 h-3.5 rounded accent-(--gold) cursor-pointer shrink-0"
        />
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <TemperaturaButtons
            leadId={lead.id}
            value={lead.temperatura}
            disabled={tempLocked || lead.status === 'Cancelado'}
            onChange={onTempChange}
          />
        </div>

        <button
          type="button"
          onClick={() => router.push(`/crm/leads/${lead.id}`)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-(--text-primary) text-sm font-semibold tracking-tight truncate">
              {lead.nome} {lead.sobrenome || ''}
            </span>
            <span className="text-[10px] text-(--text-faint) font-mono tabular-nums shrink-0">
              #{String(lead.id).padStart(4, '0')}
            </span>
          </div>
          {lead.celular && (
            <div className="text-sm text-(--text-secondary) tabular-nums font-medium mt-0.5">
              {formatPhone(lead.celular)}
            </div>
          )}
        </button>

        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <RowActionsMenu
            lead={lead}
            onEdit={onEdit}
            onCreateOpportunity={onCreateOpportunity}
            onTransfer={onTransfer}
            onChangeEtapa={onChangeEtapa}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="mt-2.5 ml-9 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
        <LeadStatusBar status={lead.status} />
        {lead.etapa && (
          <>
            <span className="text-(--text-faint)">·</span>
            <span className="text-(--text-secondary) font-medium">{lead.etapa}</span>
          </>
        )}
      </div>

      <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--text-muted)">
        {lead.preVendedor?.nome && <span>Pré: {lead.preVendedor.nome}</span>}
        {lead.conta?.nome && <span className="truncate max-w-[140px]">Conta: {lead.conta.nome}</span>}
        {(lead.createdAt || lead.dataCadastro) && (
          <span className="ml-auto tabular-nums">
            {new Date(lead.createdAt || lead.dataCadastro).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}

function LeadsCardSkeleton({ rows = 4 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <div key={`mobile-skel-${i}`} className="px-4 py-4 border-b border-(--border-subtle)/50">
      <div className="flex items-start gap-3">
        <Skel className="w-3.5 h-3.5 mt-1" />
        <Skel className="w-4 h-4 rounded-full mt-0.5" />
        <div className="flex-1">
          <Skel className="h-3 w-32 mb-1.5" />
          <Skel className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-3 ml-9 flex gap-2">
        <Skel className="h-2.5 w-20" />
        <Skel className="h-2.5 w-14" />
      </div>
    </div>
  ));
}

// ── RowActionsMenu: dropdown de ações por lead ────────────────────────────
// Trigger ⋯ + popover via Portal (mesmo padrão TemperaturaButtons pra escapar
// containing block do header sticky). Agrupa ações pouco frequentes (criar
// oportunidade, transferir individual, mudar etapa, copiar tel, ligar, excluir)
// liberando peso visual do hover (apenas Editar fica inline).
function RowActionsMenu({ lead, onEdit, onCreateOpportunity, onTransfer, onChangeEtapa, onDelete }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState(null);

  // Popover alinhado à direita do trigger (ações ficam na coluna mais à direita).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_WIDTH = 220;
    const VIEWPORT_PADDING = 8;
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.right - POPOVER_WIDTH),
      window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING,
    );
    setCoords({ top: rect.bottom + 6, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleCopyPhone = async () => {
    if (!lead.celular) return;
    try {
      await navigator.clipboard.writeText(formatPhone(lead.celular));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard pode falhar em http (não-https) — silencioso é ok.
    }
  };

  const close = () => setOpen(false);
  const run = (fn) => () => { fn(); close(); };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais ações"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`p-1.5 rounded-lg transition-colors ${
          open ? 'text-(--gold) bg-(--gold-soft)' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-3)'
        }`}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && coords && createPortal(
        <div
          ref={popoverRef}
          role="menu"
          className="fixed z-50 w-[220px] overflow-hidden rounded-xl border border-(--border) bg-(--surface-2) shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
          style={{ top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={Briefcase} onClick={run(() => onCreateOpportunity(lead))}>
            Criar oportunidade
          </MenuItem>
          <MenuItem icon={ArrowRightLeft} onClick={run(() => onTransfer(lead))}>
            Transferir
          </MenuItem>
          <MenuItem icon={Route} onClick={run(() => onChangeEtapa(lead))}>
            Mudar etapa
          </MenuItem>

          <div className="my-1 border-t border-(--border-subtle)" />

          {lead.celular && (
            <>
              <MenuItem
                icon={copied ? Check : Copy}
                onClick={handleCopyPhone}
                keepOpen
              >
                {copied ? 'Copiado!' : 'Copiar telefone'}
              </MenuItem>
              <a
                role="menuitem"
                href={`tel:${lead.celular.replace(/\D/g, '')}`}
                onClick={close}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary) transition-colors"
              >
                <Phone size={14} className="shrink-0" />
                Ligar
              </a>
              <div className="my-1 border-t border-(--border-subtle)" />
            </>
          )}

          <MenuItem icon={Trash2} variant="danger" onClick={run(() => onDelete(lead))}>
            Excluir lead
          </MenuItem>
        </div>,
        document.body,
      )}
    </>
  );
}

function MenuItem({ icon: Icon, onClick, children, variant, keepOpen }) {
  const colorClass = variant === 'danger'
    ? 'text-(--danger) hover:bg-(--danger-soft) hover:text-(--danger)'
    : 'text-(--text-secondary) hover:bg-(--surface-3) hover:text-(--text-primary)';
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium tracking-tight transition-colors text-left ${colorClass}`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1">{children}</span>
    </button>
  );
}

function StatusChip({ active, dot, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 h-8 px-3 rounded-full whitespace-nowrap
        text-sm font-medium tracking-tight transition-all shrink-0
        ${active
          ? 'bg-(--surface-3) text-(--text-primary) border border-(--border) shadow-xs'
          : 'text-(--text-muted) border border-transparent hover:text-(--text-primary) hover:bg-(--surface-2)'}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden />}
      {children}
    </button>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────
export default function LeadsListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL é source of truth pros filtros (q + status + page + sort).
  // Refresh-safe, shareable, back/forward funciona naturalmente.
  const urlSearch = searchParams.get('q') || '';
  const filterStatus = searchParams.get('status') || '';
  const urlPage = Number(searchParams.get('page') || 1);
  const currentSort = parseSort(searchParams.get('sort'));
  const hasFilters = Boolean(urlSearch || filterStatus);
  // Split view: ?selected=ID abre preview lateral à direita (desktop ≥lg).
  // Em viewport <lg cai pra navegação tradicional via router.push.
  const selectedId = searchParams.get('selected') || '';

  const [leads, setLeads] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [showNovoLead, setShowNovoLead] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEtapa, setShowEtapa] = useState(false);
  // null = ação em lote (usa selectedIds); array = ação single-row específica
  const [actionTargetIds, setActionTargetIds] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { confirm, confirmProps } = useConfirm();

  const debouncedSearch = useDebounce(searchTerm);

  // Helper canônico pra escrever na URL. `replace` (não push) — evita poluir
  // o history a cada keystroke. Valores undefined/'' são removidos da URL.
  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v == null) params.delete(k);
      else params.set(k, String(v));
    });
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Debounced search → URL. Reseta página pra 1 ao mudar termo.
  useEffect(() => {
    if (debouncedSearch === urlSearch) return;
    updateParams({ q: debouncedSearch || undefined, page: undefined });
  }, [debouncedSearch, urlSearch, updateParams]);

  // URL → input: sincroniza search box com a URL em mudanças externas
  // (back/forward do browser, click em "Limpar filtros"). Sem isso, a UI
  // dessincronizava do estado real após navegação.
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLeads({
        search: urlSearch.trim() || undefined,
        status: filterStatus || undefined,
        page: urlPage,
        limit: 50,
        sortBy: currentSort?.field,
        sortDir: currentSort?.dir,
      });
      setLeads(result.data);
      setPagination({ page: result.page, totalPages: result.totalPages, total: result.total });
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
    } finally {
      setLoading(false);
    }
  }, [urlSearch, filterStatus, urlPage, currentSort?.field, currentSort?.dir]);

  useEffect(() => {
    if (!authLoading && user) {
      api('/users/lookup').then(raw => {
        const res = Array.isArray(raw) ? raw : (raw?.data ?? []);
        const list = res
          .filter(u => u.ativo !== false)
          .map(u => ({ id: u.id, nome: u.nome }));
        setSellers(list);
      }).catch(() => {});
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && user) fetchLeads();
  }, [authLoading, user, fetchLeads]);

  const handleStatusChange = (status) => {
    updateParams({ status: status || undefined, page: undefined });
  };

  // Click numa row: desktop (≥lg) abre preview lateral via ?selected=ID;
  // mobile (<lg) navega pro detalhe completo (sem espaço pra split view).
  const handleRowClick = (lead) => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      updateParams({ selected: String(lead.id) });
    } else {
      router.push(`/crm/leads/${lead.id}`);
    }
  };

  const handleClosePreview = () => {
    updateParams({ selected: undefined });
  };

  const handlePageChange = (page) => {
    updateParams({ page: page > 1 ? page : undefined });
  };

  // Sort 3-state: not-active → asc → desc → not-active (volta ao default)
  const handleSort = (field) => {
    let next;
    if (currentSort?.field !== field) next = `${field}:asc`;
    else if (currentSort.dir === 'asc') next = `${field}:desc`;
    else next = undefined;
    updateParams({ sort: next, page: undefined });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    updateParams({ q: undefined, status: undefined, page: undefined });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([]);
    else setSelectedIds(leads.map(l => l.id));
  };

  const openBulkTransfer = () => { setActionTargetIds(null); setShowTransfer(true); };
  const openBulkEtapa = () => { setActionTargetIds(null); setShowEtapa(true); };
  const openRowTransfer = (lead) => { setActionTargetIds([lead.id]); setShowTransfer(true); };
  const openRowEtapa = (lead) => { setActionTargetIds([lead.id]); setShowEtapa(true); };

  const handleCreateOpportunity = (lead) => {
    router.push(`/crm/oportunidade-de-negocio?leadId=${lead.id}`);
  };

  const handleTransfer = async (preVendedorId) => {
    const isSingle = actionTargetIds !== null;
    const targets = isSingle ? actionTargetIds : selectedIds;
    try {
      await transferLeads(targets, preVendedorId);
      if (!isSingle) setSelectedIds([]);
      setActionTargetIds(null);
      setShowTransfer(false);
      await fetchLeads();
    } catch (err) {
      setErrorMsg(err?.message || err || 'Erro ao transferir.');
    }
  };

  const handleEtapa = async (etapa) => {
    const isSingle = actionTargetIds !== null;
    const targets = isSingle ? actionTargetIds : selectedIds;
    try {
      await updateEtapaLote(targets, etapa);
      if (!isSingle) setSelectedIds([]);
      setActionTargetIds(null);
      setShowEtapa(false);
      await fetchLeads();
    } catch (err) {
      setErrorMsg(err?.message || err || 'Erro ao atualizar etapa.');
    }
  };

  const handleDelete = (id, nome) => {
    confirm({
      title: 'Remover Lead',
      message: `Tem certeza que deseja remover o lead "${nome}"?`,
      confirmLabel: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteLead(id);
          await fetchLeads();
        } catch (err) {
          setErrorMsg(err?.message || err || 'Erro ao remover.');
        }
      },
    });
  };

  const handleLeadSaved = () => {
    setShowNovoLead(false);
    fetchLeads();
  };

  if (authLoading) return null;

  return (
    <>
      <div className="mb-4 max-w-[1800px] mx-auto">
        {/* Header — Workshop: title sans + count mono inline, sem subtitle */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-(--border-subtle) pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-(--text-primary) tracking-[-0.02em] flex items-baseline gap-3 min-w-0">
            Leads
            <span className="font-mono text-base text-(--text-faint) tabular-nums font-normal">
              {pagination.total.toString().padStart(2, '0')}
            </span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchLeads} className="p-2 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-lg transition-colors border border-transparent hover:border-(--gold-soft) active:scale-95" title="Atualizar" style={{ transitionTimingFunction: 'var(--ease-spring)' }}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowNovoLead(true)}
              className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-4 h-9 rounded-lg font-semibold transition-transform text-sm active:scale-[0.98] whitespace-nowrap tracking-tight"
              style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
            >
              <Plus size={14} /> Novo lead
            </button>
          </div>
        </div>

        <div className="mb-4">
          {/* Status Tabs — navegação primária */}
          <div className="mb-4 pb-3 border-b border-(--border-subtle)">
            <StatusTabs value={filterStatus} onChange={handleStatusChange} />
          </div>

          {/* Filtros e Ações de Topo */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-3">
            <div className="flex items-center gap-2 w-full xl:w-auto">
              <div className="relative group flex-1 xl:w-[360px] xl:flex-none">
                <input type="text" placeholder="Buscar nome, celular, CEP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-(--surface-2) text-sm text-(--text-primary) pl-9 pr-4 h-9 rounded-2xl border border-(--border) focus:border-(--gold) focus:ring-4 focus:ring-(--gold)/5 outline-none transition-all placeholder:text-(--text-muted) font-medium shadow-xs" />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)" />
              </div>
            </div>

            {/* Ações de Topo + Ações em Lote */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Importar / Exportar */}
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-2xl text-sm font-medium text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--success)/40 hover:bg-(--success-soft) hover:text-(--success) transition-all shadow-xs">
                <Upload size={12} /> Importar
              </button>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-2xl text-sm font-medium text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--success)/40 hover:bg-(--success-soft) hover:text-(--success) transition-all shadow-xs">
                <Download size={12} /> Exportar
              </button>

              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm font-semibold text-(--gold) ml-2">{selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}</span>
                  <button onClick={openBulkTransfer} className="flex items-center gap-1.5 px-3 h-9 rounded-2xl text-sm font-medium text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--gold)/40 hover:bg-(--gold-soft) hover:text-(--gold) transition-all shadow-xs">
                    <ArrowRightLeft size={12} /> Transferir
                  </button>
                  <button onClick={openBulkEtapa} className="flex items-center gap-1.5 px-3 h-9 rounded-2xl text-sm font-medium text-(--text-secondary) bg-(--surface-2) border border-(--border) hover:border-(--gold) hover:bg-(--gold-soft) hover:text-(--gold) transition-all shadow-xs">
                    <Route size={12} /> Definir Etapa
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Listagem + preview pane (split view em ≥lg quando ?selected=ID) */}
          <div className={selectedId ? 'lg:flex lg:gap-4 lg:items-start' : ''}>
          <div className={`w-full min-w-0 overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2) ${selectedId ? 'lg:flex-1' : ''}`}>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-(--border-subtle)">
              {loading && leads.length === 0 && <LeadsCardSkeleton rows={4} />}
              {!loading && leads.length === 0 && (
                <EmptyContent hasFilters={hasFilters} onClear={handleClearFilters} />
              )}
              {leads.map((lead) => {
                const tempLocked = requiresAdminToEdit(lead.status) && !hasPermission(user, CRM_PERMISSIONS.EDIT_AFTER_SALE);
                return (
                  <LeadCard
                    key={`card-${lead.id}`}
                    lead={lead}
                    selected={selectedIds.includes(lead.id)}
                    onToggleSelect={() => toggleSelect(lead.id)}
                    tempLocked={tempLocked}
                    onTempChange={(updatedLead) => {
                      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, temperatura: updatedLead.temperatura } : l));
                    }}
                    onEdit={(l) => router.push(`/crm/leads/${l.id}`)}
                    onCreateOpportunity={handleCreateOpportunity}
                    onTransfer={openRowTransfer}
                    onChangeEtapa={openRowEtapa}
                    onDelete={(l) => handleDelete(l.id, l.nome)}
                  />
                );
              })}
            </div>

            {/* Desktop tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
                <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
                  <tr>
                    <th className="py-2.5 px-3 w-[40px]">
                      <input type="checkbox" checked={selectedIds.length === leads.length && leads.length > 0} onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded accent-(--gold) cursor-pointer" />
                    </th>
                    <SortableHeader field="temperatura" currentSort={currentSort} onSort={handleSort} className="py-2.5 px-3 text-center w-[40px]">
                      Temp
                    </SortableHeader>
                    <SortableHeader field="nome" currentSort={currentSort} onSort={handleSort} className="py-2.5 px-3 sticky left-0 z-20 bg-(--surface-1)/95 backdrop-blur-sm">
                      Nome
                    </SortableHeader>
                    <th className="py-2.5 px-3">Telefone</th>
                    <SortableHeader field="status" currentSort={currentSort} onSort={handleSort} className="py-2.5 px-3">
                      Status
                    </SortableHeader>
                    <th className="py-2.5 px-3">Etapa</th>
                    <th className="py-2.5 px-3">Conta</th>
                    <th className="py-2.5 px-3">Pré-vendedor</th>
                    <th className="py-2.5 px-3">CEP</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <SortableHeader field="createdAt" currentSort={currentSort} onSort={handleSort} className="py-2.5 px-3">
                      Data
                    </SortableHeader>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle)">
                  {loading && leads.length === 0 && <LeadsTableSkeleton rows={6} />}
                  {!loading && leads.length === 0 && (
                    <EmptyState hasFilters={hasFilters} onClear={handleClearFilters} />
                  )}
                  {leads.map(lead => {
                    const tempLocked = requiresAdminToEdit(lead.status) && !hasPermission(user, CRM_PERMISSIONS.EDIT_AFTER_SALE);
                    return (
                    <tr
                      key={lead.id}
                      onClick={() => handleRowClick(lead)}
                      className={`hover:bg-(--surface-1)/60 transition-colors group cursor-pointer ${
                        String(lead.id) === selectedId ? 'bg-(--surface-1)/80' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)}
                          className="w-3.5 h-3.5 rounded accent-(--gold) cursor-pointer" />
                      </td>
                      <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <TemperaturaButtons
                          leadId={lead.id}
                          value={lead.temperatura}
                          disabled={tempLocked || lead.status === 'Cancelado'}
                          onChange={(updatedLead) => {
                            setLeads(prev => prev.map(l =>
                              l.id === lead.id ? { ...l, temperatura: updatedLead.temperatura } : l,
                            ));
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px] sticky left-0 z-10 bg-(--surface-2) group-hover:bg-(--surface-1) transition-colors">
                        <div className="flex flex-col leading-tight min-w-0">
                          {/* Workshop: nome UPPERCASE com tracking-tight — voice editorial */}
                          <span className="text-(--text-primary) text-sm font-semibold tracking-[-0.01em] uppercase truncate group-hover:text-(--gold-hover) transition-colors">
                            {lead.nome} {lead.sobrenome || ''}
                          </span>
                          <span className="text-[11px] text-(--text-faint) font-mono tabular-nums mt-0.5">
                            #{String(lead.id).padStart(4, '0')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-(--text-secondary) text-sm tabular-nums">{formatPhone(lead.celular)}</td>
                      <td className="py-2.5 px-3"><LeadStatusBar status={lead.status} /></td>
                      <td className="py-2.5 px-3 text-(--text-secondary) text-sm font-medium">{lead.etapa || lead.etapaJornada || '—'}</td>
                      <td className="py-2.5 px-3 text-(--text-secondary) text-sm font-medium max-w-[140px] truncate">
                        {lead.conta?.nome || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-(--text-muted) text-sm">{lead.preVendedor?.nome || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-(--text-muted) text-xs tabular-nums">{lead.cep || '—'}</td>
                      <td className="py-2.5 px-3 text-xs">
                        {lead.origemExterna
                          ? <span className="inline-flex items-center gap-1 text-(--gold) font-medium tracking-tight">
                              <span className="h-2 w-[2px] bg-(--gold)" aria-hidden /> Externo
                            </span>
                          : <span className="text-(--text-muted)">{lead.origemCanal || 'Manual'}</span>
                        }
                      </td>
                      <td className="py-2.5 px-3 font-mono text-(--text-muted) text-xs tabular-nums">
                        {(lead.createdAt || lead.dataCadastro) ? new Date(lead.createdAt || lead.dataCadastro).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => router.push(`/crm/leads/${lead.id}`)} className="p-1.5 text-(--text-muted) hover:text-(--gold) transition-colors rounded-lg hover:bg-(--gold-soft)" title="Editar"><Edit size={14} /></button>
                          <RowActionsMenu
                            lead={lead}
                            onEdit={(l) => router.push(`/crm/leads/${l.id}`)}
                            onCreateOpportunity={handleCreateOpportunity}
                            onTransfer={openRowTransfer}
                            onChangeEtapa={openRowEtapa}
                            onDelete={(l) => handleDelete(l.id, l.nome)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (() => {
            const current = pagination.page;
            const total = pagination.totalPages;
            const pages = [];

            // Always show first page
            pages.push(1);

            // Show ellipsis or pages around current
            if (current > 3) pages.push('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
              pages.push(i);
            }
            if (current < total - 2) pages.push('...');

            // Always show last page
            if (total > 1) pages.push(total);

            const startItem = (current - 1) * 50 + 1;
            const endItem = Math.min(current * 50, pagination.total);

            return (
              <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-subtle)">
                <span className="text-sm text-(--text-muted) tabular-nums">
                  {startItem}–{endItem} de {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={current <= 1}
                    onClick={() => handlePageChange(current - 1)}
                    className="px-2.5 py-1.5 rounded-xl text-sm font-medium text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-(--text-muted) text-sm select-none">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-xl text-sm font-medium tabular-nums transition-all ${
                          p === current
                            ? 'bg-(--gold) text-(--on-gold) shadow-md border border-(--gold)'
                            : 'text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft)'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    disabled={current >= total}
                    onClick={() => handlePageChange(current + 1)}
                    className="px-2.5 py-1.5 rounded-xl text-sm font-medium text-(--text-secondary) border border-(--border) hover:bg-(--gold-soft) hover:text-(--gold) hover:border-(--gold-soft) transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
        {/* Preview lateral (split view) — só desktop ≥lg */}
        {selectedId && (
          <div className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
            <LeadPreviewPane leadId={selectedId} onClose={handleClosePreview} />
          </div>
        )}
        </div>
      </div>

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-4 py-3 rounded-2xl text-base font-bold shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={14} />
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-(--danger) hover:text-(--danger) ml-2"><X size={14} /></button>
        </div>
      )}

      {showNovoLead && <NovoLeadModal sellers={sellers} user={user} onClose={() => setShowNovoLead(false)} onSaved={handleLeadSaved} />}
      {showTransfer && <TransferModal sellers={sellers} onClose={() => { setShowTransfer(false); setActionTargetIds(null); }} onConfirm={handleTransfer} />}
      {showEtapa && <EtapaModal onClose={() => { setShowEtapa(false); setActionTargetIds(null); }} onConfirm={handleEtapa} />}
      <ConfirmDialog {...confirmProps} />
    </>
  );
}
