# Spec: CRM Frontend — Consumo do Core

**Módulo:** `crm-frontend`
**Status:** active
**Owner:** Thiago (CTO)
**Última revisão:** 2026-04-24
**Versão:** 1.0.0
**Pré-requisito:** `specs/crm.md` v1.2.0 (backend core já shipada)

---

## 1. Propósito

Atualizar a UI do CRM para consumir os endpoints novos do backend (Tasks #9–#13) e **fechar a regressão crítica** introduzida pelo Task #14: o frontend hoje envia `status`/`etapa`/`idKanban` no `PUT /api/crm/leads/:id`, e o backend agora rejeita com 400.

Sem esta spec implementada, a tela de edição de Lead quebra 100% ao salvar em produção.

**O que este módulo NÃO faz:**
- Não implementa Kanban completo (Task separada — placeholder `/app/kanban` existe)
- Não introduz dark mode (decisão consciente — ver §11)
- Não migra para biblioteca de formulários (continua `useState` manual)
- Não toca em fluxos fora da edição/listagem de Lead (Fila, Marketing, Vendas ficam intactos)

---

## 2. Glossário — alinhamento com backend

Todos os termos seguem `specs/crm.md` §2. Tradução curta pra UI:

| Backend | UI |
|---|---|
| `status` | **Status do Lead** (dropdown com 8 valores canônicos) |
| `etapa` | **Etapa** (derivada, só leitura na UI — nunca editável) |
| `temperatura` | **Temperatura** (ícone + label: Muito interessado / Interessado / Sem interesse) |
| `statusAntesCancelamento` | oculto (usado apenas no fluxo de reativação) |
| `kanbanCard.coluna` | idem `etapa` (só leitura) |
| `LeadHistory` | **Histórico** (timeline cronológica) |
| N.O.N. | **Oportunidade de Negócio** (botão na lista + edição) |

---

## 3. Atores e permissões — UI awareness

UI deve **esconder ou desabilitar** ações que o usuário não tem permissão pra executar. Backend continua sendo a fonte de verdade (retorna 403), mas UI mostrar botão que sempre falha é má experiência.

| Permissão | Controle na UI |
|---|---|
| `crm:leads:update` | Habilita botão "Salvar" na edição, botão "Cancelar Lead" |
| `crm:leads:reactivate` | Mostra botão "Retornar ao Atendimento" em Leads cancelados |
| `crm:leads:edit-after-sale` | Habilita edição quando lead está em Venda/Pós-venda |
| `crm:leads:create` | Habilita botão "Novo Lead" |
| `crm:leads:delete` | Habilita botão "Excluir" |
| `crm:leads:read` + filial match | Gate de acesso à tela de edição |

Verificação via `<PermissionGate permission="..." />` componente existente ou hook `useAuth().user.permissions.includes(...)`.

---

## 4. Telas afetadas

### 4.1 `/crm/leads/[id]` — Tela de Edição de Lead

**Mudanças obrigatórias** (fechar a regressão):

1. **Salvar** (botão "Salvar"):
   - **Não envia `status`, `etapa`, `etapaJornada`, `idKanban`** no body do `PUT /api/crm/leads/:id`.
   - Payload passa a ser exatamente os campos editáveis: `nome`, `sobrenome`, `celular`, `email`, `cep`, `conjugeNome`, `conjugeSobrenome`, `conjugeCelular`, `conjugeEmail`, `origemCanal`, `preVendedorId`.
   - Campos `status` e `etapa` continuam exibidos **somente leitura** (com badge colorido), nunca editáveis aqui.

2. **Dropdown de Status** (substitui edição inline):
   - Botão dedicado "Alterar status" ou dropdown ação.
   - Ao clicar, abre um modal/popover com opções válidas de transição (ver §7 da spec backend).
   - Envia `PUT /api/crm/leads/:id/status` com `{ status, motivo?, contexto? }`.
   - Pra status `"Aguardando Planta/medidas"`, `"Agendado vídeo chamada"`, `"Agendado visita na loja"`, abre também campo de data/hora no modal (`contexto.agendadoPara`).
   - Feedback: toast de sucesso + refetch do lead.

3. **Temperatura**:
   - Novo componente: três "chips" ou pill buttons (🔥 Muito interessado / 🙂 Interessado / ❄️ Sem interesse).
   - Clique dispara `PUT /api/crm/leads/:id/temperatura` com `{ temperatura }`.
   - Se clicado o valor atual → no-op no servidor, UI mostra brief feedback.

4. **Cancelar Lead**:
   - Botão "Cancelar Lead" (vermelho, no grupo de ações).
   - Abre modal pedindo **motivo obrigatório** (textarea).
   - Envia `PUT /api/crm/leads/:id/cancel` com `{ motivo }`.
   - Oculta o botão quando lead já está em `"Cancelado"`.

5. **Retornar Lead para Atendimento** (só quando status = `"Cancelado"`):
   - Botão "Retornar ao Atendimento" substitui "Cancelar".
   - Abre modal com **escolha** (spec §6.5):
     - **Radio A — Reativar este Lead** (continua o mesmo registro)
     - **Radio B — Criar novo Lead vinculado a mesma Conta** (Opção B)
   - Campo motivo opcional.
   - Envia `PUT /api/crm/leads/:id/reactivate` com `{ modo: 'reativar'|'novo', motivo? }`.
   - Modo "reativar" → refetch do lead atual.
   - Modo "novo" → redireciona pra `/crm/leads/${leadNovo.id}`.

6. **Histórico do Lead** (painel lateral ou seção abaixo do form):
   - Lista cronológica dos eventos (mais recente no topo).
   - Cada item mostra: ícone por tipo, autor, data/hora relativa ("há 2 horas"), resumo legível.
   - Inicialmente carrega os últimos 20 (vêm incluídos no `GET /api/crm/leads/:id`).
   - Botão "Ver mais" pagina via `GET /api/crm/leads/:id/history?cursor=...`.

7. **Bloqueio pós-venda**:
   - Quando `status = "Venda" | "Pós-venda"` e usuário não tem `crm:leads:edit-after-sale`:
     - Inputs ficam `disabled`.
     - Botão "Salvar" fica `disabled` com tooltip explicativo.
     - Badge no topo: "Somente leitura — Lead com venda concluída".
   - Ações como mudar status e cancelar respeitam o backend (que retorna 403 se tentar).

8. **Remover campo `idKanban`**:
   - Campo deletado do formulário (era input manual, só polui UI).
   - `INITIAL_LEAD_FORM` em `lib/leadConstants.js` perde `idKanban`.

### 4.2 `/crm/leads` — Lista de Leads

**Mudanças mínimas** (escopo: não quebrar):

- Coluna "Status" continua exibindo `lead.status` do GET — já retorna correto do backend.
- Coluna **Temperatura** (nova, opcional nesta versão): mostra ícone se `lead.temperatura` não for nulo.
- Bulk operations (`leads-transfer`, `leads-etapa`) continuam funcionando — endpoints existentes sem guard novo.

### 4.3 `/crm/leads/novo` — Criação de Lead

**Mudanças mínimas**:

- Remove campo `idKanban` do form (mesmo raciocínio).
- `status` no body do POST é **silenciosamente ignorado pelo backend** (Zod strip) — pode ser removido do form por limpeza, mas não é bloqueador.

### 4.4 Tela de Detalhe de Account (`/crm/conta-pessoa/[id]` ou equivalente)

**Mudança opcional** (nice-to-have): listar todos os Leads vinculados à Conta. Útil pra ver histórico comercial de uma pessoa. Não é bloqueador de prod.

---

## 5. Componentes novos a construir

| Componente | Responsabilidade | Reuso |
|---|---|---|
| `LeadStatusBadge` | Pill colorido por status (8 variantes) | Usado em list + detail |
| `LeadStatusDropdown` | Menu de ações de transição + modal de data/hora | Detail page |
| `TemperaturaPicker` | 3 chips radio | Detail page |
| `CancelLeadDialog` | Modal com textarea de motivo obrigatório | Detail page |
| `ReactivateLeadDialog` | Modal com radio `reativar` vs `novo` + motivo opcional | Detail page (condicional) |
| `LeadHistoryTimeline` | Lista de eventos com ícone+autor+tempo relativo | Detail page |
| `PostSaleReadOnlyBanner` | Banner topo indicando bloqueio de edição | Detail page (condicional) |

---

## 6. Componentes existentes a reusar

- `Button` (`ui/Button.jsx`) — botões de ação
- `ConfirmDialog` (`ui/ConfirmDialog.jsx`) — base pra modais nossos? Ver plan.
- `ModalBase` (`ui/ModalBase.jsx`) — wrapper comum
- `PremiumSelect` — dropdown de status
- `PermissionGate` — gate RBAC
- `useAuth()` — sessão
- `api()` client — fetch + refresh automático
- `formatPhone()`, `validateLeadForm()` — utilities

---

## 7. API client (`services/crmApi.js`) — funções novas

Adicionar exportações:

```js
export function transitionLeadStatus(id, { status, motivo, contexto }) { ... }
export function setLeadTemperatura(id, temperatura) { ... }
export function cancelLead(id, motivo) { ... }
export function reactivateLead(id, { modo, motivo }) { ... }
export function getLeadHistory(id, { cursor, limit } = {}) { ... }
```

Todas retornam o shape definido na spec backend §4. Zero lógica extra no client — só wrappers finos.

---

## 8. UX — transições de status

Matriz de validade visual (UI replica a do backend):

**Deve permitir** (botões ativos):
- De qualquer intermediário → qualquer intermediário ou Venda
- De Venda → Pós-venda (só ADM pós-venda)
- De qualquer estado → Cancelado (via botão "Cancelar Lead" separado)

**Deve bloquear ou ocultar**:
- De Cancelado → qualquer (usa botão "Retornar ao Atendimento" separado)
- De Pós-venda → intermediários

Feedback de erro:
- 400 do backend (transição inválida) → toast vermelho com a mensagem do backend
- 403 (sem permissão) → toast específico "Você não tem permissão pra esta ação"
- 409 (lock ocupado, usado na fila) → toast amarelo "Tente novamente em alguns segundos"

---

## 9. Estados de carregamento e erro

- **Loading**: skeleton shimmer nos cards do lead + timeline. Não spinner genérico.
- **Empty history**: "Nenhum evento registrado ainda."
- **Network error**: banner amarelo topo com botão "Tentar novamente".
- **Submit em curso**: botão mostra spinner inline + `disabled`.
- **Sucesso**: toast verde 3s no topo (já existe padrão).

---

## 10. Não-funcionais

- **Performance**:
  - Tela de edição carrega em < 500ms no 3G throttled (Lighthouse staging)
  - Timeline renderiza 50+ eventos sem jank
- **Acessibilidade**: navegação por teclado completa. Focus rings visíveis. Modais fecham com ESC.
- **Segurança**: nenhuma permissão é bypassada só escondendo UI — backend valida tudo. UI só evita click que vai falhar.

---

## 11. Decisões tomadas (não são TBDs)

- ✅ **Dark mode NÃO nesta sprint.** Padrão atual é light. Mudar pra dark-first é projeto separado (impacta todas as telas).
- ✅ **Sem React Hook Form nesta sprint.** `useState` manual continua — form de Lead tem ~12 campos, não justifica migração agora.
- ✅ **Histórico inicial limitado aos 20 já incluídos no GET.** Paginação via cursor só quando usuário clicar "Ver mais".
- ✅ **Temperatura é chip picker, não dropdown.** 3 opções visuais fixas, um clique pra mudar.
- ✅ **Transições de status via modal dedicado**, não edição inline do dropdown antigo. Reduz chance de click acidental.

---

## 12. Critérios de "feito" desta spec

- [ ] Tela `/crm/leads/[id]` salva sem enviar status/etapa/idKanban
- [ ] Botão dedicado dispara `PUT /leads/:id/status` com sucesso
- [ ] Temperatura picker atualiza via `PUT /leads/:id/temperatura`
- [ ] Cancelar abre modal, motivo obrigatório, `PUT /leads/:id/cancel` funciona
- [ ] Reativar abre modal com escolha, ambos modos funcionam
- [ ] Timeline de história renderiza os 20 eventos iniciais + paginação
- [ ] Bloqueio pós-venda funciona (inputs disabled + banner)
- [ ] Campo `idKanban` removido do form
- [ ] Smoke E2E no staging com usuário real: criar → editar → mudar status → cancelar → reativar
- [ ] Sem regressão em `/crm/leads` (listagem) ou `/crm/leads/novo` (criação)

---

## 13. Histórico de revisões

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0.0 | 2026-04-24 | Thiago | Primeira versão — escopo: consumir backend core + fechar regressão |
