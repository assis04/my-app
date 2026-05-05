import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-(--gold) text-(--on-gold) hover:bg-(--gold-hover) shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)]',
  secondary:
    'bg-(--surface-2) text-(--text-primary) border border-(--border) hover:bg-(--surface-3) hover:border-(--gold)',
  danger:
    'bg-transparent text-(--danger) border border-(--danger) hover:bg-(--danger-soft)',
  ghost:
    'text-(--text-muted) border border-transparent hover:bg-(--surface-2) hover:text-(--text-primary)',
};

const SIZES = {
  sm: 'px-2 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-3 py-2 text-xs rounded-2xl gap-2',
  lg: 'px-4 py-3 text-sm rounded-2xl gap-2',
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
        inline-flex items-center justify-center font-black tracking-tight
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
