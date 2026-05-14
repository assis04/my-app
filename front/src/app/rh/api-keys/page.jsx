'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound, Plus, Copy, Check, AlertTriangle, X,
  Building2, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { listApiKeys, createApiKey, revokeApiKey } from '@/services/apiKeysApi';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ADMIN_ROLES } from '@/lib/roles';

/**
 * Gestão de API keys para origens externas (landing pages, integrações).
 *
 * Identidade Workshop: eyebrows mono, name UPPERCASE, prefix mono tabular,
 * datas em font-mono, sem glass-card.
 */
export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState(null); // chave recém-criada (mostra plainKey 1 vez)
  const { confirm, confirmProps } = useConfirm();

  useEffect(() => {
    if (!authLoading && user && !ADMIN_ROLES.includes(user.role)) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listApiKeys();
      setKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err?.message || 'Erro ao carregar chaves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && ADMIN_ROLES.includes(user.role)) load();
  }, [authLoading, user]);

  const handleRevoke = (key) => {
    confirm({
      title: 'Revogar chave',
      message: `Tem certeza? Todas as integrações usando "${key.name}" param de funcionar imediatamente. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Revogar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await revokeApiKey(key.id);
          await load();
        } catch (err) {
          setErrorMsg(err?.message || 'Erro ao revogar.');
        }
      },
    });
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-(--border-subtle) pb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-(--text-primary) tracking-[-0.02em] flex items-baseline gap-3 min-w-0">
          Chaves de API
          <span className="font-mono text-base text-(--text-faint) tabular-nums font-normal">
            {keys.length.toString().padStart(2, '0')}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-(--text-muted) hover:text-(--gold) hover:bg-(--gold-soft) rounded-lg transition-colors border border-transparent hover:border-(--gold-soft) active:scale-95"
            title="Atualizar"
            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-4 h-9 rounded-lg font-semibold transition-transform text-sm active:scale-[0.98] tracking-tight"
            style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
          >
            <Plus size={14} /> Nova chave
          </button>
        </div>
      </div>

      <p className="text-sm text-(--text-muted) mb-6 max-w-[60ch]">
        Chaves para autenticar formulários externos (landing pages) que enviam leads
        ao CRM via <span className="font-mono text-(--text-secondary)">POST /api/public/leads</span>.
        A chave plain-text é mostrada <strong className="text-(--gold)">apenas uma vez</strong>;
        guarde em local seguro.
      </p>

      {/* Tabela */}
      <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
            <thead className="bg-(--surface-1)/40 text-(--text-faint) font-semibold text-[11px] uppercase tracking-wider border-b border-(--border-subtle)">
              <tr>
                <th className="py-2.5 px-4">Nome</th>
                <th className="py-2.5 px-4">Prefix</th>
                <th className="py-2.5 px-4">Filial</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Último uso</th>
                <th className="py-2.5 px-4">Criada</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border-subtle)">
              {loading && keys.length === 0 && (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`apik-skel-${i}`} className="border-b border-(--border-subtle)/50">
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-32" /></td>
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-24" /></td>
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-14" /></td>
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
                    <td className="py-3 px-4"><span className="block bg-(--surface-3) animate-pulse rounded h-3 w-20" /></td>
                    <td className="py-3 px-4"></td>
                  </tr>
                ))
              )}
              {!loading && keys.length === 0 && (
                <tr><td colSpan={7} className="py-14 text-center">
                  <div className="w-10 h-10 bg-(--surface-1) rounded-2xl flex items-center justify-center mx-auto mb-3 border border-(--border-subtle) text-(--text-faint)">
                    <KeyRound size={18} />
                  </div>
                  <p className="text-(--text-muted) text-sm font-medium">Nenhuma chave criada ainda.</p>
                </td></tr>
              )}
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-(--surface-1)/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className="text-(--text-primary) font-semibold uppercase tracking-[-0.01em] text-sm">{key.name}</span>
                    {key.source && (
                      <div className="text-[11px] font-mono text-(--text-faint) mt-0.5">{key.source}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-(--text-secondary) tabular-nums">{key.prefix}…</td>
                  <td className="py-2.5 px-4 text-(--text-secondary) text-sm">
                    {key.filial?.nome || <span className="text-(--text-faint)">—</span>}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge active={key.active} revokedAt={key.revokedAt} expiresAt={key.expiresAt} />
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-(--text-muted) tabular-nums">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-(--text-muted) tabular-nums">
                    {new Date(key.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {key.active && (
                      <button
                        onClick={() => handleRevoke(key)}
                        className="text-xs font-medium text-(--text-muted) hover:text-(--danger) hover:bg-(--danger-soft) px-2 py-1 rounded-lg transition-colors"
                      >
                        Revogar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal criação */}
      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setCreatedKey(result);
            setShowCreate(false);
            load();
          }}
        />
      )}

      {/* Modal exibição da chave recém-criada (uma vez só) */}
      {createdKey && (
        <CreatedKeyModal apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}

      <ConfirmDialog {...confirmProps} />

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-(--danger-soft) border border-(--danger)/30 text-(--danger) px-4 py-3 rounded-2xl text-sm font-medium shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={14} />
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="text-(--danger) hover:text-(--danger) ml-2">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────
function StatusBadge({ active, revokedAt, expiresAt }) {
  if (revokedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--text-faint)">
        <span className="w-1.5 h-1.5 rounded-full bg-(--text-faint)" /> Revogada
      </span>
    );
  }
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--danger)">
        <span className="w-1.5 h-1.5 rounded-full bg-(--danger)" /> Expirada
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--success)">
        <span className="w-1.5 h-1.5 rounded-full bg-(--success)" /> Ativa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--text-faint)">
      <span className="w-1.5 h-1.5 rounded-full bg-(--text-faint)" /> Inativa
    </span>
  );
}

// ─── Modal: criação ───────────────────────────────────────────────────────
function CreateKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [filialId, setFilialId] = useState('');
  const [filiais, setFiliais] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/filiais')
      .then((data) => setFiliais(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await createApiKey({
        name: name.trim(),
        source: source.trim() || null,
        filialId: filialId || null,
      });
      onCreated(result);
    } catch (err) {
      setError(err?.message || 'Erro ao criar chave.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-(--surface-2) border border-(--border) rounded-2xl w-full max-w-md p-5 space-y-4"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-(--text-primary) tracking-tight">Nova chave de API</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-3) rounded-lg">
            <X size={14} />
          </button>
        </header>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Landing Construtoras"
            autoFocus
            className="w-full bg-(--surface-1) text-(--text-primary) text-sm font-medium px-3 h-9 rounded-lg border border-(--border) focus:border-(--gold) focus:ring-2 focus:ring-(--gold-soft) outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">Identificador de origem</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Ex: landing-construtoras (opcional)"
            className="w-full bg-(--surface-1) text-(--text-primary) text-sm font-medium px-3 h-9 rounded-lg border border-(--border) focus:border-(--gold) focus:ring-2 focus:ring-(--gold-soft) outline-none font-mono"
          />
          <p className="text-xs text-(--text-faint)">Vai parar em <span className="font-mono">LeadHistory.payload.source</span> pra auditoria.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">Filial</label>
          <select
            value={filialId}
            onChange={(e) => setFilialId(e.target.value)}
            className="w-full bg-(--surface-1) text-(--text-primary) text-sm font-medium px-3 h-9 rounded-lg border border-(--border) focus:border-(--gold) focus:ring-2 focus:ring-(--gold-soft) outline-none"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">— Sem filial padrão —</option>
            {filiais.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          <p className="text-xs text-(--text-faint)">Se setada, leads recebidos por essa chave ficam atribuídos a esta filial.</p>
        </div>

        {error && (
          <div className="text-sm text-(--danger) flex items-center gap-2 bg-(--danger-soft) px-3 py-2 rounded-lg">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 h-9 rounded-lg text-sm font-medium text-(--text-muted) hover:bg-(--surface-3) transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-(--gold) text-(--on-gold) px-4 h-9 rounded-lg font-semibold text-sm disabled:opacity-50 transition-transform active:scale-[0.98]"
            style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
          >
            {submitting ? 'Gerando…' : 'Gerar chave'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Modal: chave recém-criada (mostra plainKey UMA VEZ) ──────────────────
function CreatedKeyModal({ apiKey, onClose }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-(--surface-2) border border-(--gold)/30 rounded-2xl w-full max-w-lg p-5 space-y-4"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-(--text-primary) tracking-tight flex items-center gap-2">
            <KeyRound size={14} className="text-(--gold)" />
            Chave gerada — guarde agora
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-3) rounded-lg">
            <X size={14} />
          </button>
        </header>

        <div className="bg-(--gold-soft) border border-(--gold)/30 rounded-lg p-3 flex items-start gap-2 text-xs text-(--gold-hover)">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <p className="font-medium">
            Esta chave só será exibida agora. Copie e guarde em local seguro — não há como recuperá-la depois.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-(--text-faint) font-mono font-semibold">{apiKey.name}</label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 bg-(--surface-1) border border-(--border) rounded-lg px-3 py-2.5 font-mono text-sm text-(--text-primary) tabular-nums break-all">
              {visible ? apiKey.plainKey : '•'.repeat(40)}
            </div>
            <button
              onClick={() => setVisible((v) => !v)}
              className="px-3 text-(--text-muted) hover:text-(--gold) hover:bg-(--surface-3) rounded-lg transition-colors"
              title={visible ? 'Ocultar' : 'Mostrar'}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 text-(--text-muted) hover:text-(--gold) hover:bg-(--surface-3) rounded-lg transition-colors"
              title={copied ? 'Copiado!' : 'Copiar'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="text-xs text-(--text-muted) bg-(--surface-1) rounded-lg p-3 font-mono space-y-1">
          <div>POST https://api-sys.moveisvalcenter.com.br/api/public/leads</div>
          <div>X-Api-Key: <span className="text-(--gold)">{apiKey.prefix}…</span></div>
          <div>Content-Type: application/json</div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-(--gold) text-(--on-gold) px-4 h-9 rounded-lg font-semibold text-sm transition-transform active:scale-[0.98]"
            style={{ boxShadow: 'var(--shadow-warm)', transitionTimingFunction: 'var(--ease-spring)' }}
          >
            Já guardei
          </button>
        </div>
      </div>
    </div>
  );
}
