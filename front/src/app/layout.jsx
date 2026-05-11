'use client';

import { useEffect } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/ui/DashboardShell';

// Geist: tipografia geométrica neutra do time da Vercel — única, sóbria,
// elimina o "AI slop" do default Inter/Helvetica. Geist Mono pra tabular-nums
// em métricas, IDs, telefones (já consumido via classes utilitárias do Tailwind).
const geist = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export default function RootLayout({ children }) {
  // Auditoria de a11y em runtime — só em desenvolvimento. axe-core abre console
  // logs em qualquer violação WCAG (AA por default) detectada na DOM ao vivo.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined') return;
    Promise.all([import('react'), import('react-dom'), import('@axe-core/react')])
      .then(([React, ReactDOM, axe]) => {
        axe.default(React.default, ReactDOM.default, 1000);
      })
      .catch(() => {
        // Não bloquear o app se o axe falhar — só dev.
      });
  }, []);

  return (
    <html lang="pt" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </AuthProvider>
      </body>
    </html>
  );
}
