'use client';

import { Loader2, Save, AlertCircle } from 'lucide-react';

/**
 * Sticky bottom action bar — só aparece quando há mudanças não salvas.
 * Concentra a ação primária ("Salvar Alterações") sempre visível,
 * eliminando a necessidade de scroll até o footer da página.
 *
 * Esconde quando isDirty=false — limpa o ruído visual quando não há
 * o que salvar.
 */
export default function DirtyBar({
  isDirty,
  isSaving,
  dirtyCount = 0,
  onSave,
  onDiscard,
  disabled = false,
}) {
  if (!isDirty) return null;

  const message = dirtyCount > 0
    ? `${dirtyCount} alteraç${dirtyCount === 1 ? 'ão' : 'ões'} não salv${dirtyCount === 1 ? 'a' : 'as'}`
    : 'Você tem alterações não salvas';

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-(--border) bg-(--surface-2)/95 backdrop-blur-md shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-2 duration-200">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-(--gold) text-sm font-bold">
          <AlertCircle size={14} />
          <span>{message}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving || disabled}
            className="px-4 py-2 rounded-2xl text-sm font-black text-(--text-muted) border border-(--border) hover:bg-(--surface-3) hover:text-(--text-primary) transition-all active:scale-95 disabled:opacity-50 tracking-tight"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || disabled}
            className="px-5 py-2 rounded-2xl text-sm font-black text-(--on-gold) bg-(--gold) hover:bg-(--gold-hover) transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)] tracking-tight"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={14} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
