import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-linear-to-r from-sky-500 to-sky-600 text-white shadow-xl shadow-sky-900/10 hover:shadow-sky-500/40 hover:shadow-2xl',
  secondary:
    'bg-white text-slate-600 border border-slate-200 shadow-xs hover:bg-slate-50 hover:text-slate-900',
  danger:
    'bg-linear-to-r from-rose-500 to-rose-600 text-white shadow-xl shadow-rose-900/10 hover:shadow-rose-500/40 hover:shadow-2xl',
  ghost:
    'text-slate-400 border border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 text-xs rounded-2xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-2xl gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-black uppercase tracking-tight
        transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 12 : 14} />
      ) : null}
      {children}
    </button>
  );
}
