'use client';

import { DollarSign } from 'lucide-react';

export default function ComissoesPage() {
  return (
    <div className="max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-(--border)">
        <div>
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Comissões</h1>
          <p className="text-xs text-(--text-muted) font-bold mt-0.5">Cálculo e acompanhamento de comissões</p>
        </div>
      </header>

      <div className="glass-card border border-(--border-subtle) rounded-3xl p-6 shadow-floating mb-6 bg-(--surface-2)/40 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 bg-(--surface-1) rounded-3xl flex items-center justify-center border border-(--border-subtle) text-(--text-muted)">
            <DollarSign size={28} />
          </div>
          <p className="text-(--text-muted) font-black text-xs tracking-tight">Módulo em desenvolvimento</p>
        </div>
      </div>
    </div>
  );
}
