/**
 * Header padronizado de página.
 * Props:
 *  - title: string
 *  - subtitle: string (opcional)
 *  - action: ReactNode (ex: botão "Novo Lead")
 */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-slate-200 pb-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 font-bold mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
