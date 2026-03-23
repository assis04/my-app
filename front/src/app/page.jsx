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
    <div className="flex h-screen bg-[#212121] text-zinc-100 font-sans">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6 text-zinc-400">
            <button className="hover:text-white transition-colors"><ChevronLeft size={20} /></button>
            <span className="text-sm font-medium">Dezembro 2025</span>
            <button className="hover:text-white transition-colors"><ChevronRight size={20} /></button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">{user?.nome}</p>
              <p className="text-xs text-zinc-500 mt-1">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-[#e81cff] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-fuchsia-900/20">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[#2a2a2a] p-5 rounded-2xl border border-zinc-700/50 shadow-sm">
              <p className="text-zinc-400 text-sm font-medium">Total de vendas:</p>
              <p className="text-2xl font-bold mt-3">R$ 9999,00</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[420px]">
          {/* Bar Charts Container */}
          <div className="lg:col-span-2 bg-[#2a2a2a] rounded-2xl border border-zinc-700/50 flex flex-col md:flex-row shadow-sm">
            <div className="flex-1 p-6 flex flex-col border-b md:border-b-0 md:border-r border-zinc-700/50">
              <h2 className="text-center text-lg mb-8 text-zinc-100 font-medium">Histórico de faturamento</h2>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 20 }}>
                    <CartesianGrid vertical={false} stroke="#404040" />
                    <XAxis 
                      dataKey="name" 
                      tick={<CustomXAxisTick />} 
                      axisLine={{ stroke: '#404040' }} 
                      tickLine={false} 
                    />
                    <YAxis 
                      ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                      tick={{ fill: '#71717a', fontSize: 11 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Bar dataKey="uv" fill="#e81cff" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex-1 p-6 flex flex-col">
              <h2 className="text-center text-lg mb-8 text-zinc-100 font-medium">Histórico de faturamento</h2>
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -25, bottom: 20 }}>
                    <CartesianGrid vertical={false} stroke="#404040" />
                    <XAxis 
                      dataKey="name" 
                      tick={<CustomXAxisTick />} 
                      axisLine={{ stroke: '#404040' }} 
                      tickLine={false} 
                    />
                    <YAxis 
                      ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                      tick={{ fill: '#71717a', fontSize: 11 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Bar dataKey="uv" fill="#e81cff" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Donut Chart Container */}
          <div className="lg:col-span-1 bg-[#2a2a2a] p-6 rounded-2xl border border-zinc-700/50 flex flex-col shadow-sm">
            <h2 className="text-center text-lg mb-4 text-zinc-100 font-medium">Total de visitas</h2>
            <div className="flex-1 relative min-h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Labels for the Pie chart to mimic the image */}
              <div className="absolute top-[25%] left-[15%] text-xs flex flex-col items-center">
                <span className="font-bold text-zinc-300 text-sm">8</span>
                <span className="text-zinc-500">20.5%</span>
              </div>
              <div className="absolute bottom-[20%] left-[20%] text-xs flex flex-col items-center">
                <span className="font-bold text-zinc-300 text-sm">14</span>
                <span className="text-zinc-500">35.9%</span>
              </div>
              <div className="absolute top-[20%] right-[15%] text-xs flex flex-col items-center">
                <span className="font-bold text-zinc-300 text-sm">17</span>
                <span className="text-zinc-500">43.6%</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
