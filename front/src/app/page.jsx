'use client';

import { Settings, Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

// Tokens hex pro Recharts (não consome classes Tailwind).
const CHART_COLORS = {
  gold:        '#E9B601',
  goldHover:   '#C99A00',
  success:     '#7FB069',
  danger:      '#E26D5C',
  textMuted:   '#9E988E',
  textFaint:   '#6F6A62',
  borderGrid:  '#2A241E',
};

const barData = [
  { name: '9\n6.0%', uv: 10 },
  { name: '32\n21.3%', uv: 35 },
  { name: '99\n66.0%', uv: 100 },
  { name: '10\n6.7%', uv: 12 },
];

const channelData = [
  { name: 'WhatsApp', value: 8, color: CHART_COLORS.success },
  { name: 'Site', value: 14, color: CHART_COLORS.gold },
  { name: 'Redes Sociais', value: 17, color: CHART_COLORS.danger },
];

const KPIS = [
  { label: 'Vendas totais',  value: 'R$ 9.999',  trend: 12,  unit: '%' },
  { label: 'Novos leads',    value: '142',       trend: 5,   unit: '%' },
  { label: 'Conversão',      value: '8,4%',      trend: -2,  unit: '%' },
  { label: 'Ticket médio',   value: 'R$ 1.200',  trend: 0,   unit: '%' },
  { label: 'ROI estimado',   value: '4,2x',      trend: 18,  unit: '%' },
];

const CHANNEL_LEGEND = [
  { label: 'WhatsApp',     color: CHART_COLORS.success },
  { label: 'Site',         color: CHART_COLORS.gold },
  { label: 'Redes sociais', color: CHART_COLORS.danger },
];

const CustomXAxisTick = ({ x, y, payload }) => {
  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill={CHART_COLORS.textMuted} fontSize={11} fontWeight={500}>
        {lines[0]}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill={CHART_COLORS.textFaint} fontSize={10}>
        {lines[1]}
      </text>
    </g>
  );
};

// Trend pill compacto: dot+texto+arrow, sem pill saturado.
function TrendIndicator({ trend, unit = '%' }) {
  const Icon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
  const colorClass = trend > 0
    ? 'text-(--success)'
    : trend < 0
    ? 'text-(--danger)'
    : 'text-(--text-muted)';
  const sign = trend > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${colorClass}`}>
      <Icon size={11} strokeWidth={2.5} />
      {sign}{trend}{unit}
    </span>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <>
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-3 border-b border-(--border-subtle)">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-(--text-primary) tracking-tight">Dashboard</h1>
          <p className="text-sm text-(--text-muted) mt-0.5">Visão geral · Dezembro 2025</p>
        </div>
        <div className="flex items-center gap-2 bg-(--surface-2) p-1.5 pr-3 rounded-2xl border border-(--border-subtle)">
          <div className="w-7 h-7 bg-(--gold) rounded-xl flex items-center justify-center text-(--on-gold) font-semibold text-sm">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-(--text-primary) tracking-tight">{user?.nome}</p>
            <p className="text-xs text-(--text-muted)">{user?.role}</p>
          </div>
        </div>
      </header>

      {/* Banner — dados ilustrativos */}
      <div className="flex items-start gap-2.5 mb-6 px-3 py-2 rounded-xl bg-(--gold-soft) border border-(--gold)/20">
        <Info size={14} className="text-(--gold) shrink-0 mt-0.5" />
        <p className="text-xs text-(--gold-hover) font-medium">
          Dados ilustrativos. Métricas reais serão integradas em breve.
        </p>
      </div>

      {/* KPI Cards — Bento minimalista */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {KPIS.map((kpi, i) => (
          <article
            key={i}
            className="bg-(--surface-2) p-4 rounded-2xl border border-(--border-subtle) hover:border-(--gold)/30 transition-colors group"
          >
            <p className="text-(--text-muted) text-xs font-medium tracking-tight mb-2 uppercase">
              {kpi.label}
            </p>
            <p className="text-2xl font-bold text-(--text-primary) tracking-tight tabular-nums leading-none">
              {kpi.value}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <TrendIndicator trend={kpi.trend} unit={kpi.unit} />
              <span className="text-[11px] text-(--text-faint)">vs. mês ant.</span>
            </div>
          </article>
        ))}
      </section>

      {/* Charts — Bento 2-col grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Charts (2 cols) */}
        <div className="lg:col-span-2 bg-(--surface-2) rounded-2xl border border-(--border-subtle) flex flex-col md:flex-row overflow-hidden">
          <ChartPanel
            title="Faturamento"
            dotColor="bg-(--gold)"
            barColor={CHART_COLORS.gold}
            cta="Detalhes"
            className="border-b md:border-b-0 md:border-r border-(--border-subtle)"
          />
          <ChartPanel
            title="Leads"
            dotColor="bg-(--success)"
            barColor={CHART_COLORS.success}
            dashed
            settingsIcon
            className="bg-(--surface-1)/40"
          />
        </div>

        {/* Donut */}
        <div className="lg:col-span-1 bg-(--surface-2) p-6 rounded-2xl border border-(--border-subtle) flex flex-col">
          <h2 className="text-sm font-semibold text-(--text-primary) mb-4 flex items-center gap-2 tracking-tight">
            <span className="w-2 h-2 rounded-full bg-(--gold)" /> Canais
          </h2>
          <div className="relative h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {channelData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-(--text-primary) tracking-tight tabular-nums">39</span>
              <span className="text-xs text-(--text-muted) mt-1 uppercase tracking-wider font-medium">Acessos</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            {CHANNEL_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-(--surface-1) border border-(--border-subtle)">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-medium text-(--text-secondary) truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Painel de gráfico ────────────────────────────────────────────────────
function ChartPanel({ title, dotColor, barColor, dashed = false, cta, settingsIcon, className = '' }) {
  return (
    <div className={`flex-1 p-6 flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-(--text-primary) flex items-center gap-2 tracking-tight">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} /> {title}
        </h2>
        {cta && (
          <button className="text-xs font-medium text-(--gold) hover:bg-(--gold-soft) px-2.5 py-1 rounded-lg border border-(--gold)/30 transition-all active:scale-95">
            {cta}
          </button>
        )}
        {settingsIcon && <Settings size={12} className="text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer" />}
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 10 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.borderGrid} strokeDasharray={dashed ? '3 3' : undefined} />
            <XAxis dataKey="name" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} />
            <YAxis
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: CHART_COLORS.textMuted, fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="uv" fill={barColor} radius={[4, 4, 4, 4]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
