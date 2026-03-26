'use client'

import {
  BarChart2,
  Brain,
  Target,
  CheckSquare,
  Flag,
  Users,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';
import { Sidebar } from '@/components/ui/Sidebar';

const barData = [
  { name: '9\n6.0%', uv: 10 },
  { name: '32\n21.3%', uv: 35 },
  { name: '99\n66.0%', uv: 100 },
  { name: '10\n6.7%', uv: 12 },
];

const pieData = [
  { name: 'Group A', value: 8, color: '#3f1f3f' }, // Dark purple
  { name: 'Group B', value: 14, color: '#a21caf' }, // Medium fuchsia
  { name: 'Group C', value: 17, color: '#e81cff' }, // Bright magenta
];

const CustomXAxisTick = ({ x, y, payload }) => {
  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#71717a" fontSize={12}>
        {lines[0]}
      </text>
      <text x={0} y={0} dy={28} textAnchor="middle" fill="#71717a" fontSize={12}>
        {lines[1]}
      </text>
    </g>
  );
};

export default function Home() {
  const { user, logout, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans page-transition">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto min-w-0 bg-slate-50">
        <header className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-4 text-slate-400">
            <button className="hover:text-slate-900 transition-all p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 shadow-sm active:scale-90"><ChevronLeft size={18} /></button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Dezembro 2025</span>
            <button className="hover:text-slate-900 transition-all p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 shadow-sm active:scale-90"><ChevronRight size={18} /></button>
          </div>
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 bg-linear-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-sky-200">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <p className="text-xs font-black text-slate-900 tracking-tight">{user?.nome}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{user?.role}</p>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {[
            { label: 'Vendas Totais', value: 'R$ 9.999', trend: '+12%', color: 'sky' },
            { label: 'Novos Leads', value: '142', trend: '+5%', color: 'emerald' },
            { label: 'Conversão', value: '8.4%', trend: '-2%', color: 'rose' },
            { label: 'Ticket Médio', value: 'R$ 1.200', trend: '0%', color: 'amber' },
            { label: 'ROI Estimado', value: '4.2x', trend: '+18%', color: 'violet' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-premium hover:shadow-floating transition-all group cursor-pointer overflow-hidden relative active:scale-[0.98]">
              <div className={`absolute top-0 left-0 w-1 h-full bg-${kpi.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tighter">{kpi.value}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border ${
                  kpi.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  kpi.trend.startsWith('-') ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                  'bg-slate-50 text-slate-400 border-slate-100'
                }`}>
                  {kpi.trend}
                </span>
                <span className="text-[9px] text-slate-300 font-bold uppercase">vs. mês ant.</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[380px]">
          {/* Bar Charts Container */}
          <div className="lg:col-span-2 glass-card rounded-3xl border border-white/60 flex flex-col md:flex-row shadow-floating overflow-hidden">
            <div className="flex-1 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-100/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-sky-500" /> Faturamento
                </h2>
                <button className="text-[10px] font-black text-sky-600 hover:bg-sky-50 px-3 py-1 rounded-xl border border-sky-100 transition-all active:scale-95 shadow-sm uppercase tracking-tight">Detalhes</button>
              </div>
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 10 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={<CustomXAxisTick />} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Bar dataKey="uv" fill="#0ea5e9" radius={[4, 4, 4, 4]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col bg-slate-50/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" /> Leads
                </h2>
                <Settings size={12} className="text-slate-300" />
              </div>
              <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 10 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={<CustomXAxisTick />} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Bar dataKey="uv" fill="#10b981" radius={[4, 4, 4, 4]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Donut Chart Container */}
          <div className="lg:col-span-1 glass-card p-6 rounded-3xl border border-white/60 flex flex-col shadow-floating">
            <h2 className="text-xs font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-violet-500" /> Canais
            </h2>
            <div className="flex-1 relative min-h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'WhatsApp', value: 8, color: '#0ea5e9' },
                      { name: 'Site', value: 14, color: '#6366f1' },
                      { name: 'Redes Sociais', value: 17, color: '#a855f7' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="90%"
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {[0,1,2].map((i) => (
                      <Cell key={`cell-${i}`} fill={['#0ea5e9', '#6366f1', '#a855f7'][i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 tracking-tighter">39</span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Acessos</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'WPP', color: 'sky' },
                { label: 'SITE', color: 'indigo' },
                { label: 'SOCIAL', color: 'violet' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-2 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 mb-1.5`} />
                  <span className="text-[9px] font-black text-slate-500 uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
