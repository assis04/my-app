'use client';

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/ui/DashboardShell';

export default function RootLayout({ children }) {
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
