'use client';

import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';
import {
  Armchair,
  Brain,
  Users,
  Settings,
  LogOut,
  Building2,
  Wallet,
  KanbanSquare,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const activePill = 'bg-linear-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-lg shadow-sky-900/10';
const inactivePill = 'text-slate-500 hover:text-slate-900 hover:bg-slate-50';
const activeSubItem = 'text-sky-600 font-medium flex items-center gap-2';
const inactiveSubItem = 'text-slate-400 hover:text-slate-600 transition-colors';

function SubLink({ href, label, pathname }) {
  const isActive = pathname === href;
  return (
    <Link href={href} className={`text-sm ${isActive ? activeSubItem : inactiveSubItem}`}>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />}
      {label}
    </Link>
  );
}

function SectionToggle({ href, icon: Icon, label, isActive, pathname }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${isActive ? activePill : inactivePill}`}
    >
      <Icon size={20} className={isActive ? 'text-white' : ''} />
      {label}
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
    </Link>
  );
}

function SubMenu({ children }) {
  return (
    <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-slate-100 ml-6 py-1">
      {children}
    </div>
  );
}

export function Sidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const isCrmActive = pathname === '/' || pathname.startsWith('/crm');
  const isCaptacaoActive = pathname.startsWith('/captacao');
  const isRhActive = pathname.startsWith('/rh');
  const isFinanceiroActive = pathname.startsWith('/financeiro');

  return (
    <aside className="w-64 bg-white flex flex-col justify-between py-6 shrink-0 h-screen sticky top-0 border-r border-slate-200 shadow-sm z-40">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-[#0ea5e9] to-[#0284c7] rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
            <Armchair size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-wide">Moveis <span className="text-[#0ea5e9]">Valcenter</span></span>
        </div>

        <nav className="flex flex-col gap-1 px-4">

          {/* ── CRM ── */}
          <div className="flex flex-col mb-1 mt-1">
            <SectionToggle href="/" icon={Brain} label="CRM" isActive={isCrmActive} pathname={pathname} />

            {isCrmActive && (
              <SubMenu>
                <SubLink href="/crm/marketing" label="Marketing" pathname={pathname} />
                <SubLink href="/" label="Dashboard" pathname={pathname} />
                <SubLink href="/crm/conta-pessoa" label="Conta / Pessoa" pathname={pathname} />
                <SubLink href="/crm/leads" label="Leads" pathname={pathname} />
                <SubLink href="/crm/fila-da-vez" label="Lista de Vez" pathname={pathname} />
                <SubLink href="/crm/oportunidade-de-negocio" label="Oportunidade de Negócio" pathname={pathname} />
                <SubLink href="/crm/vendas" label="Vendas" pathname={pathname} />
              </SubMenu>
            )}
          </div>

          {/* ── Captação ── */}
          <div className="flex flex-col mb-1 mt-1">
            <SectionToggle href="/captacao/construtoras" icon={Building2} label="Captação" isActive={isCaptacaoActive} pathname={pathname} />

            {isCaptacaoActive && (
              <SubMenu>
                <SubLink href="/captacao/construtoras" label="Construtoras" pathname={pathname} />
                <SubLink href="/captacao/especificadores" label="Especificadores" pathname={pathname} />
              </SubMenu>
            )}
          </div>

          {/* ── RH ── */}
          <PermissionGate permissions={['rh:usuarios:read', 'rh:perfis:read', 'rh:equipes:read', 'rh:filiais:read']}>
            <div className="flex flex-col mb-1 mt-1">
              <SectionToggle href="/rh/equipes" icon={Users} label="RH" isActive={isRhActive} pathname={pathname} />

              {isRhActive && (
                <SubMenu>
                  <PermissionGate permission="rh:equipes:read">
                    <SubLink href="/rh/equipes" label="Equipes" pathname={pathname} />
                  </PermissionGate>
                  <SubLink href="/rh/colaboradores" label="Colaboradores" pathname={pathname} />
                  <PermissionGate permission="rh:usuarios:read">
                    <SubLink href="/rh/gerenciar-usuarios" label="Usuários" pathname={pathname} />
                  </PermissionGate>
                  <SubLink href="/rh/cargos-funcoes" label="Cargos e Funções" pathname={pathname} />
                  <PermissionGate permission="rh:perfis:read">
                    <SubLink href="/rh/gerenciar-perfis" label="Perfis de Acesso" pathname={pathname} />
                  </PermissionGate>
                  <SubLink href="/rh/controle-de-ponto" label="Controle de Ponto" pathname={pathname} />
                  <SubLink href="/rh/metas" label="Metas" pathname={pathname} />
                  <SubLink href="/rh/comissoes" label="Comissões" pathname={pathname} />
                </SubMenu>
              )}
            </div>
          </PermissionGate>

          {/* ── Financeiro ── */}
          <div className="flex flex-col mb-1 mt-1">
            <SectionToggle href="/financeiro/tesouraria" icon={Wallet} label="Financeiro" isActive={isFinanceiroActive} pathname={pathname} />

            {isFinanceiroActive && (
              <SubMenu>
                <SubLink href="/financeiro/tesouraria" label="Tesouraria" pathname={pathname} />
                <SubLink href="/financeiro/financiamento" label="Financiamento" pathname={pathname} />
              </SubMenu>
            )}
          </div>

          {/* ── Gráfico Kanban ── */}
          <Link
            href="/kanban"
            className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/kanban') ? activePill : inactivePill}`}
          >
            <KanbanSquare size={20} className={pathname.startsWith('/kanban') ? 'text-white' : ''} />
            Gráfico Kanban
            {pathname.startsWith('/kanban') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </Link>

          {/* ── Agenda ── */}
          <Link
            href="/agenda"
            className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/agenda') ? activePill : inactivePill}`}
          >
            <CalendarDays size={20} className={pathname.startsWith('/agenda') ? 'text-white' : ''} />
            Agenda
            {pathname.startsWith('/agenda') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </Link>

        </nav>
      </div>

      <div className="px-4 pb-4">
        <div className="h-px w-full bg-slate-100 mb-4" />
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
