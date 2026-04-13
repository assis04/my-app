'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export function DashboardShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Páginas sem sidebar (login, register, etc.)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/alterar-senha');

  if (isAuthPage || loading || !user) {
    return children;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative page-transition">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-xl border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/10 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar />
      </div>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 w-full pt-16 md:pt-6 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
