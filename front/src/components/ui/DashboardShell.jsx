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

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/alterar-senha');

  if (isAuthPage) {
    return children;
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex h-dvh bg-(--bg-base) text-(--text-primary) font-sans relative page-transition">
      <button
        className="md:hidden absolute top-4 left-4 z-50 bg-(--surface-2) p-2 rounded-xl border border-(--border) text-(--text-muted) shadow-(--shadow-premium) transition-all hover:bg-(--surface-3) hover:text-(--text-primary)"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu size={24} />
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar />
      </div>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0 w-full pt-16 md:pt-6 bg-(--bg-base)">
        {children}
      </main>
    </div>
  );
}
