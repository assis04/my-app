/**
 * RBAC - Permissions Master Library (Moveis Valcenter ERP)
 * 
 * Format: resource:action:scope
 * Special: '*' = full access (ADM only)
 * 
 * Scopes: 'own' | 'branch' | 'all'
 */

export const PERMISSIONS = {
  // ── RH ─────────────────────────────────────────────
  RH_USERS_READ:    'rh:usuarios:read',
  RH_USERS_CREATE:  'rh:usuarios:create',
  RH_USERS_UPDATE:  'rh:usuarios:update',
  RH_USERS_DELETE:  'rh:usuarios:delete',
  RH_PERFIS_READ:   'rh:perfis:read',
  RH_PERFIS_CREATE: 'rh:perfis:create',
  RH_PERFIS_UPDATE: 'rh:perfis:update',
  RH_EQUIPES_READ:  'rh:equipes:read',
  RH_EQUIPES_MANAGE:'rh:equipes:manage',

  // ── CRM ─────────────────────────────────────────────
  LEADS_READ_ALL:    'leads:read:all',
  LEADS_READ_BRANCH: 'leads:read:branch',
  LEADS_READ_OWN:    'leads:read:own',
  LEADS_CREATE_ALL:  'leads:create:all',
  LEADS_CREATE_BRANCH:'leads:create:branch',
  LEADS_CREATE_OWN:  'leads:create:own',
  LEADS_UPDATE_ALL:  'leads:update:all',
  LEADS_UPDATE_BRANCH:'leads:update:branch',
  LEADS_UPDATE_OWN:  'leads:update:own',
  LEADS_DELETE_ALL:  'leads:delete:all',
  LEADS_DELETE_BRANCH:'leads:delete:branch',
  LEADS_DELETE_OWN:  'leads:delete:own',

  // ── Kanban ───────────────────────────────────────────
  KANBAN_READ_ALL:    'kanban:read:all',
  KANBAN_READ_BRANCH: 'kanban:read:branch',
  KANBAN_READ_OWN:    'kanban:read:own',
  KANBAN_EDIT_ALL:    'kanban:update:all',
  KANBAN_EDIT_BRANCH: 'kanban:update:branch',
  KANBAN_EDIT_OWN:    'kanban:update:own',

  // ── Tarefas ────────────────────────────────────────
  TASKS_MANAGE_ALL:    'tasks:manage:all',
  TASKS_MANAGE_BRANCH: 'tasks:manage:branch',
  TASKS_MANAGE_OWN:    'tasks:manage:own',

  // ── Dashboard / Relatórios ─────────────────────────
  REPORTS_READ_ALL:    'reports:read:all',
  REPORTS_READ_BRANCH: 'reports:read:branch',
  REPORTS_READ_OWN:    'reports:read:own',

  // ── Agenda ─────────────────────────────────────────
  AGENDA_FULL: 'agenda:manage:all',

  // ── Notificações ───────────────────────────────────
  NOTIFICATIONS_SEND:    'notifications:send:all',
  NOTIFICATIONS_RECEIVE: 'notifications:receive:all',

  // ── Configurações ─────────────────────────────────
  CONFIG_MANAGE: 'config:manage:all',
};

/**
 * Módulos visíveis no Modal de Criação de Perfil, com label e key.
 */
export const SYSTEM_MODULES = [
  {
    category: "Recursos Humanos (RH)",
    color: "text-(--success)",
    borderColor: "border-(--success)/40",
    bgColor: "bg-(--success-soft)/50",
    modules: [
      { key: PERMISSIONS.RH_USERS_READ,    label: "Usuários - Visualizar" },
      { key: PERMISSIONS.RH_USERS_CREATE,  label: "Usuários - Criar" },
      { key: PERMISSIONS.RH_USERS_UPDATE,  label: "Usuários - Editar" },
      { key: PERMISSIONS.RH_USERS_DELETE,  label: "Usuários - Remover" },
      { key: PERMISSIONS.RH_PERFIS_READ,   label: "Perfis - Visualizar" },
      { key: PERMISSIONS.RH_PERFIS_CREATE, label: "Perfis - Criar" },
      { key: PERMISSIONS.RH_PERFIS_UPDATE, label: "Perfis - Editar" },
      { key: PERMISSIONS.RH_EQUIPES_READ,  label: "Equipes - Visualizar" },
      { key: PERMISSIONS.RH_EQUIPES_MANAGE,label: "Equipes - Gerenciar" },
    ]
  },
  {
    category: "CRM & Funil de Vendas",
    color: "text-(--gold)",
    borderColor: "border-(--gold)/40",
    bgColor: "bg-(--gold-soft)/50",
    modules: [
      { key: PERMISSIONS.LEADS_READ_ALL,    label: "Todos os Leads - Ver" },
      { key: PERMISSIONS.LEADS_READ_BRANCH, label: "Leads da Filial - Ver" },
      { key: PERMISSIONS.LEADS_READ_OWN,    label: "Leads Próprios - Ver" },
      { key: PERMISSIONS.LEADS_CREATE_ALL,  label: "Crear Leads (Todas Filiais)" },
      { key: PERMISSIONS.LEADS_CREATE_BRANCH,label:"Criar Leads (Filial)" },
      { key: PERMISSIONS.LEADS_CREATE_OWN,  label: "Criar Leads (Próprios)" },
      { key: PERMISSIONS.LEADS_UPDATE_ALL,  label: "Editar Todos os Leads" },
      { key: PERMISSIONS.LEADS_UPDATE_BRANCH,label:"Editar Leads da Filial" },
      { key: PERMISSIONS.LEADS_UPDATE_OWN,  label: "Editar Leads Próprios" },
      { key: PERMISSIONS.LEADS_DELETE_ALL,  label: "Excluir Todos os Leads" },
      { key: PERMISSIONS.LEADS_DELETE_BRANCH,label:"Excluir Leads da Filial" },
      { key: PERMISSIONS.LEADS_DELETE_OWN,  label: "Excluir Leads Próprios" },
    ]
  },
  {
    category: "Operação Kanban",
    color: "text-(--gold-hover)",
    borderColor: "border-(--gold-hover)/40",
    bgColor: "bg-(--gold-soft)/30",
    modules: [
      { key: PERMISSIONS.KANBAN_READ_ALL,    label: "Ver todos os Kanbans" },
      { key: PERMISSIONS.KANBAN_READ_BRANCH, label: "Ver Kanban da Filial" },
      { key: PERMISSIONS.KANBAN_READ_OWN,    label: "Ver Kanban Próprio" },
      { key: PERMISSIONS.KANBAN_EDIT_ALL,    label: "Editar todos os Kanbans" },
      { key: PERMISSIONS.KANBAN_EDIT_BRANCH, label: "Editar Kanban da Filial" },
      { key: PERMISSIONS.KANBAN_EDIT_OWN,    label: "Editar Kanban Próprio" },
    ]
  },
  {
    category: "Gestão de Tarefas",
    color: "text-(--text-primary)",
    borderColor: "border-(--border)",
    bgColor: "bg-(--surface-3)",
    modules: [
      { key: PERMISSIONS.TASKS_MANAGE_ALL,    label: "Gerenciar Todas as Tarefas" },
      { key: PERMISSIONS.TASKS_MANAGE_BRANCH, label: "Gerenciar Tarefas da Filial" },
      { key: PERMISSIONS.TASKS_MANAGE_OWN,    label: "Gerenciar Tarefas Próprias" },
    ]
  },
  {
    category: "Business Intelligence",
    color: "text-(--success)",
    borderColor: "border-(--success)/30",
    bgColor: "bg-(--surface-3)",
    modules: [
      { key: PERMISSIONS.REPORTS_READ_ALL,    label: "Ver Relatórios de Todas as Filiais" },
      { key: PERMISSIONS.REPORTS_READ_BRANCH, label: "Ver Relatórios da Filial" },
      { key: PERMISSIONS.REPORTS_READ_OWN,    label: "Ver Relatórios Pessoais" },
    ]
  },
  {
    category: "Comunicação & Mensageria",
    color: "text-(--danger)",
    borderColor: "border-(--danger)/40",
    bgColor: "bg-(--danger-soft)/50",
    modules: [
      { key: PERMISSIONS.AGENDA_FULL,            label: "Agenda Google - Acesso Total" },
      { key: PERMISSIONS.NOTIFICATIONS_SEND,     label: "Notificações - Enviar" },
      { key: PERMISSIONS.NOTIFICATIONS_RECEIVE,  label: "Notificações - Receber" },
    ]
  },
  {
    category: "Painel Administrativo",
    color: "text-(--text-primary)",
    borderColor: "border-(--gold)/40",
    bgColor: "bg-(--surface-4)",
    modules: [
      { key: PERMISSIONS.CONFIG_MANAGE, label: "Configurações Globais do Sistema" },
    ]
  },
];

/**
 * Permissões específicas do CRM core (backend Tasks #14 / #12).
 * Adicionadas como constantes pra consumo seguro (sem string literal em JSX).
 */
export const CRM_PERMISSIONS = Object.freeze({
  EDIT_AFTER_SALE: 'crm:leads:edit-after-sale',
  REACTIVATE: 'crm:leads:reactivate',
});

const ADMIN_ROLES = new Set(['ADM', 'admin', 'Administrador']);

/**
 * Helper puro — verifica se um usuário tem determinada permissão.
 * Use em contextos fora de componentes React (callbacks, libs, services).
 * Em componentes, prefira o hook `usePermissions`.
 *
 * Regras (espelham o hook):
 *  - role admin → acesso total
 *  - permissions inclui '*' → acesso total
 *  - caso contrário → match literal
 *
 * Spec: specs/crm-frontend-plan.md §2.5
 */
export function hasPermission(user, perm) {
  if (!user) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes('*')) return true;
  return permissions.includes(perm);
}
