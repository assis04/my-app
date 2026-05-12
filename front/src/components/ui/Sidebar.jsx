'use client';

import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '@/components/PermissionGate';
import {
  Brain,
  Users,
  Settings,
  LogOut,
  Building2,
  Wallet,
  KanbanSquare,
  CalendarDays,
  CheckSquare,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const activePill = 'bg-(--gold) text-(--on-gold) shadow-[0_8px_24px_-8px_rgba(233,182,1,0.45)]';
const inactivePill = 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-2)';
const activeSubItem = 'text-(--gold) font-medium flex items-center gap-2';
const inactiveSubItem = 'text-(--text-muted) hover:text-(--text-primary) transition-colors';

function SubLink({ href, label, pathname }) {
  const isActive = pathname === href;
  return (
    <Link href={href} className={`text-base ${isActive ? activeSubItem : inactiveSubItem}`}>
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-(--gold)" />}
      {label}
    </Link>
  );
}

function SectionToggle({ href, icon: Icon, label, isActive }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${isActive ? activePill : inactivePill}`}
    >
      <Icon size={20} />
      {label}
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--on-gold) animate-pulse" />}
    </Link>
  );
}

function SubMenu({ children }) {
  return (
    <div className="pl-12 flex flex-col gap-2 mt-2 border-l border-(--border-subtle) ml-6 py-1">
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
    <aside aria-label="Navegação principal" className="w-64 bg-(--bg-base) flex flex-col justify-between py-6 shrink-0 h-dvh sticky top-0 border-r border-(--border-subtle) z-40">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-6 mb-8 flex items-center justify-center">
          <img src="/Valcenter.svg" alt="Móveis Valcenter" className="h-10 w-auto" />
        </div>

        <nav className="flex flex-col gap-1 px-4">

          {/* ── CRM ── */}
          <div className="flex flex-col mb-1 mt-1">
            <SectionToggle href="/" icon={Brain} label="CRM" isActive={isCrmActive} />

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
            <SectionToggle href="/captacao/construtoras" icon={Building2} label="Captação" isActive={isCaptacaoActive} />

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
              <SectionToggle href="/rh/equipes" icon={Users} label="RH" isActive={isRhActive} />

              {isRhActive && (
                <SubMenu>
                  <PermissionGate permission="rh:equipes:read">
                    <SubLink href="/rh/equipes" label="Equipes" pathname={pathname} />
                  </PermissionGate>
                  <PermissionGate permission="rh:filiais:read">
                    <SubLink href="/rh/filiais" label="Filiais" pathname={pathname} />
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
                  <SubLink href="/rh/api-keys" label="Chaves de API" pathname={pathname} />
                </SubMenu>
              )}
            </div>
          </PermissionGate>

          {/* ── Financeiro ── */}
          <div className="flex flex-col mb-1 mt-1">
            <SectionToggle href="/financeiro/tesouraria" icon={Wallet} label="Financeiro" isActive={isFinanceiroActive} />

            {isFinanceiroActive && (
              <SubMenu>
                <SubLink href="/financeiro/tesouraria" label="Tesouraria" pathname={pathname} />
                <SubLink href="/financeiro/financiamento" label="Financiamento" pathname={pathname} />
              </SubMenu>
            )}
          </div>

          {/* ── Tarefas ── */}
          <Link
            href="/tarefas"
            className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/tarefas') ? activePill : inactivePill}`}
          >
            <CheckSquare size={20} />
            Tarefas
            {pathname.startsWith('/tarefas') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--on-gold) animate-pulse" />}
          </Link>

          {/* ── Gráfico Kanban ── */}
          <Link
            href="/kanban"
            className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/kanban') ? activePill : inactivePill}`}
          >
            <KanbanSquare size={20} />
            Gráfico Kanban
            {pathname.startsWith('/kanban') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--on-gold) animate-pulse" />}
          </Link>

          {/* ── Agenda ── */}
          <Link
            href="/agenda"
            className={`flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all duration-300 ${pathname.startsWith('/agenda') ? activePill : inactivePill}`}
          >
            <CalendarDays size={20} />
            Agenda
            {pathname.startsWith('/agenda') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--on-gold) animate-pulse" />}
          </Link>

        </nav>
      </div>

      <div className="px-4 pb-4">
        <div className="h-px w-full bg-(--border-subtle) mb-4" />
        <nav className="flex flex-col gap-1">
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-2) rounded-full transition-colors font-medium">
            <Settings size={20} />
            Configurações
          </Link>
          <button onClick={logout} className="flex flex-row items-center w-full gap-3 px-4 py-3 text-(--danger) hover:bg-(--danger-soft) rounded-full transition-colors font-medium">
            <LogOut size={20} />
            Sair do Sistema
          </button>
        </nav>
      </div>
    </aside>
  );
}
