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
    <aside className="w-64 bg-white flex flex-col justify-between py-6 shrink-0 h-screen sticky top-0 border-r border-slate-200 shadow-sm z-40">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-[#0ea5e9] to-[#0284c7] rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
            <div className="flex items-center gap-1 translate-x-px">
              <span className="text-xl font-bold text-white">{`{`}</span>
              <span className="text-xl font-bold text-white">{`}`}</span>
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-wide">Ambi<span className="text-[#0ea5e9]">sistem</span></span>
        </div>
        
        <nav className="flex flex-col gap-1 px-4">
          <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 font-medium ${pathname === '/' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            <BarChart2 size={20} className={pathname === '/' ? 'text-sky-600' : ''} />
            Overview
          </Link>

          <div className="flex flex-col mb-1 mt-1">
            <Link href="/crm/solicitacao-orcamento" className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/crm') ? 'bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-sky-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              <Brain size={20} className={pathname.startsWith('/crm') ? 'text-white' : ''} />
              CRM {pathname.startsWith('/crm') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
            </Link>
            
            {/* Submenu do CRM */}
            {pathname.startsWith('/crm') && (
              <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-slate-100 ml-6 py-1">
                <Link href="/crm/solicitacao-orcamento" className={`text-sm ${pathname === '/crm/solicitacao-orcamento' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                  {pathname === '/crm/solicitacao-orcamento' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                  Solicitação de Orçamento
                </Link>
              </div>
            )}
          </div>

          <PermissionGate permissions={['captacao:leads:read', 'captacao:leads:create', 'ADM', 'Administrador']}>
            <div className="flex flex-col mb-1 mt-1">
              <Link href="/captacao/fila" className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/captacao') ? 'bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-sky-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Target size={20} className={pathname.startsWith('/captacao') ? 'text-white' : ''} />
                Captação {pathname.startsWith('/captacao') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
              </Link>
              
              {/* Submenu de Captação */}
              {pathname.startsWith('/captacao') && (
                <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-slate-100 ml-6 py-1">
                  <Link href="/captacao/fila" className={`text-sm ${pathname === '/captacao/fila' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                    {pathname === '/captacao/fila' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                    Fila da Vez
                  </Link>
                </div>
              )}
            </div>
          </PermissionGate>

          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors font-medium">
            <CheckSquare size={20} />
            Lista de Tarefas
          </Link>
          
          {/* Somente Administradores e Gerentes veem Marketing */}
          <PermissionGate allowedRoles={['ADM', 'Administrador', 'Gerente']}>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors font-medium">
              <Flag size={20} />
              Marketing
            </Link>
          </PermissionGate>

          {/* RH Module - Visible if they have any RH read permissions */}
          <PermissionGate permissions={['rh:usuarios:read', 'rh:perfis:read', 'rh:equipes:read', 'rh:filiais:read']}>
            <div className="flex flex-col mb-1 mt-1">
              <Link href="/rh/gerenciar-usuarios" className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${isRhActive ? 'bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-sky-900/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                <Users size={20} className={isRhActive ? 'text-white' : ''} />
                RH {isRhActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
              </Link>
              
              {/* Submenu do RH */}
              {isRhActive && (
                <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-slate-100 ml-6 py-1">
                  <PermissionGate permission="rh:usuarios:read">
                    <Link href="/rh/gerenciar-usuarios" className={`text-sm ${pathname === '/rh/gerenciar-usuarios' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                      {pathname === '/rh/gerenciar-usuarios' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                      Gerenciar Usuários
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:perfis:read">
                    <Link href="/rh/gerenciar-perfis" className={`text-sm ${pathname === '/rh/gerenciar-perfis' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                      {pathname === '/rh/gerenciar-perfis' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                      Gerenciar Perfis
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:equipes:read">
                    <Link href="/rh/equipes" className={`text-sm ${pathname === '/rh/equipes' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                      {pathname === '/rh/equipes' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                      Equipes
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="rh:filiais:read">
                    <Link href="/rh/filiais" className={`text-sm ${pathname === '/rh/filiais' ? 'text-sky-600 font-medium flex items-center gap-2' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}>
                      {pathname === '/rh/filiais' && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
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
        <div className="h-px w-full bg-slate-100 mb-4"></div>
        <nav className="flex flex-col gap-1">
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors font-medium">
            <Settings size={20} />
            Configurações
          </Link>
          <button onClick={logout} className="flex flex-row items-center w-full gap-3 px-4 py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors font-medium">
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </nav>
      </div>
    </aside>
  );
}
