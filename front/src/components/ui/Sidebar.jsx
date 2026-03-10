'use client';

import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';
import { BarChart2, Brain, Target, CheckSquare, Flag, Users, Bell, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const isRhActive = pathname.startsWith('/rh');

  return (
    <aside className="w-64 bg-[#0a0a0a] flex flex-col justify-between py-6 shrink-0 h-screen sticky top-0 border-r border-zinc-800/50 shadow-xl z-40">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#d946ef] to-[#c026d3] rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-900/20">
            <span className="text-xl font-bold text-white tracking-widest">{`{ }`}</span>
          </div>
          <span className="text-xl font-bold text-zinc-100 tracking-wide">Ambi<span className="text-[#e81cff]">sistem</span></span>
        </div>
        
        <nav className="flex flex-col gap-1 px-4">
          <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 font-medium ${pathname === '/' ? 'bg-zinc-800/80 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}>
            <BarChart2 size={20} className={pathname === '/' ? 'text-[#e81cff]' : ''} />
            Overview
          </Link>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-full transition-colors font-medium">
            <Brain size={20} />
            CRM
          </Link>

          <PermissionGate permissions={['captacao:leads:read', 'captacao:leads:create', 'ADM', 'Administrador']}>
            <div className="flex flex-col mb-1 mt-1">
              <Link href="/captacao/fila" className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/captacao') ? 'bg-gradient-to-r from-[#d946ef] to-[#c026d3] text-white shadow-lg shadow-fuchsia-900/20' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}>
                <Target size={20} className={pathname.startsWith('/captacao') ? 'text-white' : ''} />
                Captação {pathname.startsWith('/captacao') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
              </Link>
              
              {/* Submenu de Captação */}
              {pathname.startsWith('/captacao') && (
                <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-zinc-800 ml-6 py-1">
                  <Link href="/captacao/fila" className={`text-sm ${pathname === '/captacao/fila' ? 'text-[#e81cff] font-medium flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>
                    {pathname === '/captacao/fila' && <span className="w-1.5 h-1.5 rounded-full bg-[#e81cff]"></span>}
                    Fila da Vez
                  </Link>
                </div>
              )}
            </div>
          </PermissionGate>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-full transition-colors font-medium">
            <CheckSquare size={20} />
            Lista de Tarefas
          </Link>
          
          {/* Somente Administradores e Gerentes veem Marketing */}
          <PermissionGate allowedRoles={['ADM', 'Administrador', 'Gerente']}>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-full transition-colors font-medium">
              <Flag size={20} />
              Marketing
            </Link>
          </PermissionGate>

          {/* RH Module - Visible if they have any RH read permissions */}
          <PermissionGate permissions={['rh:usuarios:read', 'rh:perfis:read', 'rh:equipes:read', 'rh:filiais:read']}>
            <div className="flex flex-col mb-1 mt-1">
              <Link href="/rh/gerenciar-usuarios" className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${isRhActive ? 'bg-gradient-to-r from-[#d946ef] to-[#c026d3] text-white shadow-lg shadow-fuchsia-900/20' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}>
                <Users size={20} className={isRhActive ? 'text-white' : ''} />
                RH {isRhActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
              </Link>
              
              {/* Submenu do RH */}
              {isRhActive && (
                <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-zinc-800 ml-6 py-1">
                  <PermissionGate permission="rh:usuarios:read">
                    <Link href="/rh/gerenciar-usuarios" className={`text-sm ${pathname === '/rh/gerenciar-usuarios' ? 'text-[#e81cff] font-medium flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>
                      {pathname === '/rh/gerenciar-usuarios' && <span className="w-1.5 h-1.5 rounded-full bg-[#e81cff]"></span>}
                      Gerenciar Usuários
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:perfis:read">
                    <Link href="/rh/gerenciar-perfis" className={`text-sm ${pathname === '/rh/gerenciar-perfis' ? 'text-[#e81cff] font-medium flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>
                      {pathname === '/rh/gerenciar-perfis' && <span className="w-1.5 h-1.5 rounded-full bg-[#e81cff]"></span>}
                      Gerenciar Perfis
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:equipes:read">
                    <Link href="/rh/equipes" className={`text-sm ${pathname === '/rh/equipes' ? 'text-[#e81cff] font-medium flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>
                      {pathname === '/rh/equipes' && <span className="w-1.5 h-1.5 rounded-full bg-[#e81cff]"></span>}
                      Equipes
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:filiais:read">
                    <Link href="/rh/filiais" className={`text-sm ${pathname === '/rh/filiais' ? 'text-[#e81cff] font-medium flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>
                      {pathname === '/rh/filiais' && <span className="w-1.5 h-1.5 rounded-full bg-[#e81cff]"></span>}
                      Filiais
                    </Link>
                  </PermissionGate>
                </div>
              )}
            </div>
          </PermissionGate>
        </nav>
      </div>
      
      <div className="px-4 pb-4">
        <div className="h-px w-full bg-zinc-800/50 mb-4"></div>
        <nav className="flex flex-col gap-1">
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 rounded-full transition-colors font-medium">
            <Settings size={20} />
            Configurações
          </Link>
          <button onClick={logout} className="flex flex-row items-center w-full gap-3 px-4 py-3 text-red-500/80 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors font-medium">
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </nav>
      </div>
    </aside>
  );
}
