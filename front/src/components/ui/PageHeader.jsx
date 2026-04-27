/**
 * Header padronizado de página.
 * Props:
 *  - title: string
 *  - subtitle: string (opcional)
 *  - action: ReactNode (ex: botão "Novo Lead")
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-tighter italic">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 font-bold mt-0.5 italic">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
