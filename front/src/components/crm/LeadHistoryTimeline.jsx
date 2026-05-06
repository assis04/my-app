'use client';

import { useState } from 'react';
import { Loader2, History } from 'lucide-react';
import { getLeadHistory } from '@/services/crmApi';
import { renderEvent } from '@/lib/leadEvents';
import { formatRelative } from '@/lib/relativeTime';
import { friendlyErrorMessage } from '@/lib/apiError';

/**
 * Timeline vertical de eventos do LeadHistory.
 *
 * Props:
 *  - leadId: number | string
 *  - initialEvents: array de eventos já carregados (vindos do include no GET /leads/:id)
 *  - initialNextCursor: string | null — cursor para próxima página (opcional)
 *
 * Spec: specs/crm.md §4.4 | Plan: specs/crm-frontend-plan.md §2.3 + F5.1
 */
export default function LeadHistoryTimeline({
  leadId,
  initialEvents = [],
  initialNextCursor = null,
}) {
  const [events, setEvents] = useState(initialEvents);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoadMore = async () => {
    if (!nextCursor || loading) return;
    setError('');
    setLoading(true);
    try {
      const { items = [], nextCursor: newCursor = null } = await getLeadHistory(leadId, {
        cursor: nextCursor,
        limit: 20,
      });
      setEvents((prev) => [...prev, ...items]);
      setNextCursor(newCursor);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex p-3 bg-(--surface-1) rounded-2xl mb-2">
          <History size={18} className="text-(--text-muted)" />
        </div>
        <p className="text-base text-(--text-muted) font-medium">Nenhum evento registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
      {events.map((event) => {
        const { Icon, color, title } = renderEvent(event);
        const author = event.authorUser?.nome || 'Sistema';
        return (
          <article
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-2xl border border-(--border-subtle) bg-(--surface-2)/40 backdrop-blur-sm hover:border-(--border) transition-all"
          >
            <div className={`p-2 bg-(--surface-1) rounded-xl shrink-0 ${color}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-(--text-primary) leading-snug">{title}</p>
              <p className="text-sm text-(--text-muted) font-medium mt-0.5">
                {author} · {formatRelative(event.createdAt)}
              </p>
            </div>
          </article>
        );
      })}

      {error && (
        <p className="text-base text-(--danger) font-bold text-center py-2">{error}</p>
      )}

      {nextCursor && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loading}
          className="w-full py-2.5 text-sm font-black text-(--gold) border border-(--gold-soft) bg-(--gold-soft)/50 rounded-2xl hover:bg-(--gold-soft) transition-all active:scale-95 tracking-tight disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <><Loader2 size={11} className="animate-spin" /> Carregando...</> : 'Ver mais eventos'}
        </button>
      )}
    </div>
  );
}
