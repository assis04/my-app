import { Loader2 } from 'lucide-react';

/**
 * Th — Célula de cabeçalho padronizada.
 */
export function Th({ children, className = '', center = false, scope = 'col' }) {
  return (
    <th scope={scope} className={`py-2 px-3 text-xs font-black text-(--text-muted) tracking-tight italic ${center ? 'text-center' : ''} ${className}`}>
      {children}
    </th>
  );
}

/**
 * Td — Célula de dados padronizada.
 */
export function Td({ children, className = '', center = false }) {
  return (
    <td className={`py-1.5 px-3 ${center ? 'text-center' : ''} ${className}`}>
      {children}
    </td>
  );
}

/**
 * DataTable — Tabela completa com loading, empty state e wrapper padronizado.
 * Props:
 *  - columns: [{ key, label, center?, className? }]
 *  - data: array de objetos
 *  - renderRow: (item, index) => <tr>...</tr>
 *  - loading: boolean
 *  - emptyIcon: ReactNode (opcional)
 *  - emptyMessage: string
 *  - emptyHint: string (opcional)
 */
export default function DataTable({
  columns,
  data,
  renderRow,
  loading = false,
  emptyIcon,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyHint,
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-(--border-subtle) bg-(--surface-2)">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap text-(--text-secondary) border-collapse">
          <thead className="bg-(--surface-1) border-b border-(--border-subtle)">
            <tr>
              {columns.map(col => (
                <Th key={col.key} center={col.center} className={col.className || ''}>
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <Loader2 size={20} className="animate-spin text-(--gold) mx-auto" />
                  <p className="text-(--text-muted) font-black text-xs mt-2">Carregando...</p>
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {emptyIcon && <div className="w-10 h-10 bg-(--surface-3) rounded-2xl flex items-center justify-center mx-auto mb-2 border border-(--border-subtle) text-(--text-muted)">{emptyIcon}</div>}
                  <p className="text-(--text-muted) font-black text-xs">{emptyMessage}</p>
                  {emptyHint && <p className="text-(--text-faint) text-xs font-bold mt-1">{emptyHint}</p>}
                </td>
              </tr>
            )}
            {data.map((item, idx) => renderRow(item, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
