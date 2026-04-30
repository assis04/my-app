import { Loader2 } from 'lucide-react';

/**
 * Th — Célula de cabeçalho padronizada.
 */
export function Th({ children, className = '', center = false, scope = 'col' }) {
  return (
    <th scope={scope} className={`py-2 px-3 text-xs font-black text-slate-400 uppercase tracking-tighter italic ${center ? 'text-center' : ''} ${className}`}>
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
    <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap text-slate-600 border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              {columns.map(col => (
                <Th key={col.key} center={col.center} className={col.className || ''}>
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <Loader2 size={20} className="animate-spin text-sky-500 mx-auto" />
                  <p className="text-slate-300 font-black text-xs uppercase mt-2">Carregando...</p>
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {emptyIcon && <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-slate-100 text-slate-200">{emptyIcon}</div>}
                  <p className="text-slate-300 font-black text-xs uppercase">{emptyMessage}</p>
                  {emptyHint && <p className="text-slate-200 text-xs font-bold mt-1">{emptyHint}</p>}
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
