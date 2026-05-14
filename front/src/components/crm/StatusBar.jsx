/**
 * StatusBar — identidade Workshop.
 *
 * Substitui o pill colorido por uma barra vertical 2px + label tracking-tight.
 * A barra colorida sinaliza o estado sem usar a iconografia "circle" decorativa
 * dos badges genéricos. Inspirado em Linear/Cron — vocabulário de "tooling".
 *
 * Componente é palette-agnóstico (não conhece Lead vs Orçamento):
 * recebe uma palette já resolvida + label string. Wrappers semânticos
 * (LeadStatusBar, OrcamentoStatusBar) ficam por conta do consumidor.
 *
 * Props:
 *  - palette: { dot: string } — classes Tailwind com `bg-*` da cor canônica
 *  - label: string — texto do status
 */
export default function StatusBar({ palette, label, className = '' }) {
  if (!palette) {
    return <span className={`text-xs text-(--text-muted) ${className}`}>{label || '—'}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`h-3.5 w-[2px] shrink-0 ${palette.dot}`} aria-hidden />
      <span className="text-xs font-medium text-(--text-secondary) tracking-tight truncate">
        {label}
      </span>
    </span>
  );
}
