'use client';

import { KanbanSquare } from 'lucide-react';

export default function KanbanPage() {
  return (
    <div className="max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gráfico Kanban</h1>
          <p className="text-xs text-slate-400 font-bold mt-0.5">Visualização de fluxo por etapas</p>
        </div>
      </header>

      <div className="glass-card border border-white/60 rounded-3xl p-6 shadow-floating mb-6 bg-white/40 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 text-slate-300">
            <KanbanSquare size={28} />
          </div>
          <p className="text-slate-400 font-black text-xs tracking-tight">Módulo em desenvolvimento</p>
        </div>
      </div>
    </div>
  );
}
