'use client';

import { useEffect } from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/ui/DashboardShell';

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
    <html lang="pt">
      <body className="antialiased">
        <AuthProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </AuthProvider>
      </body>
    </html>
  );
}
