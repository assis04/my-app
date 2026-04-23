# Plano Técnico: CRM Frontend — Consumo do Core

**Spec de referência:** `specs/crm-frontend.md` v1.0.0
**Escopo:** consumir endpoints dos Tasks #9–#13 do backend + fechar regressão introduzida pelo Task #14.
**Versão:** 1.0.0
**Data:** 2026-04-24

---

## 1. Gap Analysis — Estado atual × Spec

| Área | Estado atual | Spec exige | Gap | Severidade |
|---|---|---|---|---|
| `PUT /leads/:id` body | Envia `status`, `etapa`, `idKanban` | Só campos editáveis, sem status/etapa | 🔴 REGRESSÃO — backend rejeita 400 | CRÍTICO |
| Mudança de status | Edição inline via `<select>` no form | Endpoint dedicado `/status` com motivo/contexto | 🔴 Endpoint novo | ALTO |
| Temperatura | Campo NÃO existe na UI | Chip picker com 3 opções | 🔴 Componente novo | ALTO |
| Cancelar lead | Não existe fluxo | Modal com motivo obrigatório + `/cancel` | 🔴 Fluxo novo | ALTO |
| Reativar lead | Não existe fluxo | Modal com escolha (reativar/novo) + `/reactivate` | 🔴 Fluxo novo | ALTO |
| Histórico | Não existe componente | Timeline cronológica com paginação | 🔴 Componente novo | MÉDIO |
| Bloqueio pós-venda | Sem guard na UI | Banner + inputs disabled quando Venda/Pós-venda | 🟡 Guard inexistente | MÉDIO |
| `idKanban` no form | Campo exibido como input | Removido (entidade KanbanCard interna) | 🟡 Limpeza | BAIXO |
| Temperatura na lista `/crm/leads` | Campo não exibido | Opcional mostrar ícone | 🟡 Nice-to-have | BAIXO |

**Bloqueador absoluto de prod:** linha 1. Sem o fix, salvar lead quebra 100%.

---

## 2. Decisões de arquitetura

### 2.1 Separação de concerns no page `[id]/page.jsx`

Hoje o arquivo mistura: form state, fetch, status dropdown, save, delete. Vai crescer. Refatoro leve antes de adicionar:

- Toda chamada de API → `services/crmApi.js` (já existe pattern)
- Lógica de status/cancel/reactivate → hooks customizados pequenos: `useLeadActions(leadId, onSuccess)`
- Histórico → componente isolado `<LeadHistoryTimeline leadId={id} initialEvents={lead.history} />`
- Page continua como orquestrador

### 2.2 Modais — reuso vs novos

Existe `ModalBase` + `ConfirmDialog`. `ConfirmDialog` é limitado (yes/no). Pra nossos casos:

- `StatusTransitionModal` — custom; lista opções válidas + campo datetime condicional
- `CancelLeadDialog` — pode usar `ConfirmDialog` estendido OU ser custom com textarea
- `ReactivateLeadDialog` — custom (radio + motivo)

Todos montados sobre `ModalBase` (mesma shell visual).

### 2.3 Timeline de histórico

Design:
- Container com `max-h-[600px] overflow-y-auto`
- Cada item: ícone à esquerda (colorido por tipo), título + subtítulo à direita, autor+tempo relativo no canto
- Ícones por `eventType`:
  - `status_changed` → arrow-right
  - `temperatura_changed` → thermometer
  - `vendedor_transferred` / `prevendedor_transferred` → user-swap
  - `agenda_scheduled` → calendar
  - `lead_cancelled` → x-circle (vermelho)
  - `lead_reactivated` → refresh (verde)
  - `note_added` → pencil
  - `external_created` → globe
  - `non_generated` → briefcase
  - `reactivated_as_new_lead` / `created_from_reactivation` → git-branch
- Tempo relativo calculado client-side (sem biblioteca — função própria pequena)

### 2.4 Cores de Status (LeadStatusBadge)

Mapa estável (consistente em list, detail, timeline):

| Status | Cor |
|---|---|
| Em prospecção | Slate (neutro, inicial) |
| Aguardando Planta/medidas | Amber (aguardando input) |
| Agendado vídeo chamada | Sky (ação agendada) |
| Agendado visita na loja | Indigo (ação presencial agendada) |
| Em Atendimento Loja | Violet (ação em curso) |
| Venda | Emerald (sucesso) |
| Pós-venda | Teal (sucesso contínuo) |
| Cancelado | Rose (negativo) |

### 2.5 Permission gating

Reusar `<PermissionGate permission="..." />` quando for gate binário.
Quando o controle é condicional (ex: banner pós-venda), usar `useAuth().user.permissions.includes(...)` inline.

Novo helper (opcional, 3 linhas):
```js
// lib/permissions.js
export const hasPermission = (user, perm) =>
  Array.isArray(user?.permissions) && (user.permissions.includes('*') || user.permissions.includes(perm));
```

### 2.6 Tratamento de erros

`api()` hoje lança `error.message`. Cada ação específica precisa mapear 4xx pra toasts claros:
- 400 — toast com `error.message` do backend (já é user-friendly)
- 403 — toast "Você não tem permissão pra esta ação"
- 404 — toast "Lead não encontrado (pode ter sido deletado)"
- 409 — toast "Recurso em uso, tente novamente em alguns segundos"
- 500+ — toast genérico "Erro interno — tente novamente"

Introduzir função: `lib/apiError.js` → `friendlyErrorMessage(error)`.

---

## 3. Contratos — request/response no client

Spec referência: `specs/crm.md` §4.

### 3.1 `transitionLeadStatus(id, { status, motivo, contexto })`
```js
PUT /api/crm/leads/${id}/status
body: { status, motivo, contexto: { agendadoPara? } }
resposta: { lead, kanbanCard, historyEvent, outboxEvents[] }
```

### 3.2 `setLeadTemperatura(id, temperatura)`
```js
PUT /api/crm/leads/${id}/temperatura
body: { temperatura }
resposta: { lead, historyEvent, changed }
```

### 3.3 `cancelLead(id, motivo)`
```js
PUT /api/crm/leads/${id}/cancel
body: { motivo }
resposta: mesma shape de /status
```

### 3.4 `reactivateLead(id, { modo, motivo })`
```js
PUT /api/crm/leads/${id}/reactivate
body: { modo: 'reativar' | 'novo', motivo? }
resposta 200 (reativar): mesma shape de /status
resposta 201 (novo): { leadAntigo, leadNovo }
```

### 3.5 `getLeadHistory(id, { cursor, limit })`
```js
GET /api/crm/leads/${id}/history?cursor=${cursor}&limit=${limit}
resposta: { items, nextCursor }
```

---

## 4. Estrutura de código — novas pastas/arquivos

```
front/src/
├── app/crm/leads/[id]/
│   └── page.jsx                 ← refactor (fix save + add ações)
├── components/crm/
│   ├── LeadStatusBadge.jsx          ← novo
│   ├── LeadStatusDropdown.jsx       ← novo (botão + modal)
│   ├── StatusTransitionModal.jsx    ← novo
│   ├── TemperaturaPicker.jsx        ← novo
│   ├── CancelLeadDialog.jsx         ← novo
│   ├── ReactivateLeadDialog.jsx     ← novo
│   ├── LeadHistoryTimeline.jsx      ← novo
│   └── PostSaleReadOnlyBanner.jsx   ← novo
├── hooks/
│   └── useLeadActions.js            ← novo (orquestra as ações + toasts)
├── lib/
│   ├── leadStatus.js                ← novo (mapa de cores, lista ordenada)
│   ├── leadEvents.js                ← novo (mapa de ícones + renderers)
│   ├── relativeTime.js              ← novo (util, sem lib)
│   ├── apiError.js                  ← novo (friendlyErrorMessage)
│   └── permissions.js               ← novo (hasPermission helper)
└── services/
    └── crmApi.js                    ← extender com 5 funções novas
```

---

## 5. Ordem de entrega — 16 tarefas

Cada tarefa é pequena o suficiente pra caber em 1 PR. Ordem minimiza risco: primeiro destrava prod, depois adiciona features.

### Fase 1 — Destravar prod (bloqueador)

| # | Tarefa | Entregável | Critério de aceitação |
|---|---|---|---|
| F1.1 | Remover `status`, `etapa`, `etapaJornada`, `idKanban` do body do save em `[id]/page.jsx` | Edit funciona no backend novo | Save retorna 200 sem erro 400 |
| F1.2 | Remover input de `idKanban` do `LeadFormFields` + `INITIAL_LEAD_FORM` | Form limpo | Nenhum componente referencia `idKanban` |

**Smoke após fase 1:** salvar um lead no staging sem erro.

### Fase 2 — API client

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| F2.1 | Adicionar 5 funções em `services/crmApi.js` | Funções exportadas + tipadas via JSDoc | Testes manuais via console — cada uma atinge o endpoint certo |
| F2.2 | Criar `lib/apiError.js` com `friendlyErrorMessage` | Mapeia 400/403/404/409/500 | Unit test com inputs mockados |

### Fase 3 — Primitives de UI

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| F3.1 | `lib/leadStatus.js` — LEAD_STATUSES, STATUS_COLORS, STATUS_ORDER | Single source of truth na UI | Consumido por badge + dropdown |
| F3.2 | `lib/leadEvents.js` — EVENT_ICONS, EVENT_RENDERERS | Mapa por eventType | Renderer retorna JSX por evento |
| F3.3 | `lib/relativeTime.js` — `formatRelative(date)` | "há 2 horas", "agora", "ontem às 14h" | Unit test com 8 casos |
| F3.4 | `lib/permissions.js` — `hasPermission(user, perm)` | Helper 3 linhas | Unit test com wildcard + match + ausência |
| F3.5 | `LeadStatusBadge.jsx` | Pill colorido por status | Renderiza 8 variantes |

### Fase 4 — Componentes de ação

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| F4.1 | `TemperaturaPicker.jsx` | 3 chips, onClick dispara callback | Dispara callback com valor correto; chip atual em destaque |
| F4.2 | `StatusTransitionModal.jsx` | Modal com opções de transição + datetime condicional | Só mostra transições válidas pra status atual |
| F4.3 | `LeadStatusDropdown.jsx` | Wrapper que abre o modal + mostra badge atual | Integração visual com layout |
| F4.4 | `CancelLeadDialog.jsx` | Modal com textarea obrigatório | Submit disabled até motivo não-vazio |
| F4.5 | `ReactivateLeadDialog.jsx` | Modal com radio + motivo opcional | Dispatch correto do modo |
| F4.6 | `PostSaleReadOnlyBanner.jsx` | Banner topo + disable logic | Aparece só em Venda/Pós-venda sem permissão |

### Fase 5 — Histórico

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| F5.1 | `LeadHistoryTimeline.jsx` | Lista cronológica + "Ver mais" paginado | Renderiza 20 inline, carrega mais via cursor |

### Fase 6 — Orquestração

| # | Tarefa | Entregável | Critério |
|---|---|---|---|
| F6.1 | `hooks/useLeadActions.js` | Hook com `onTransitionStatus`, `onCancel`, `onReactivate`, `onSetTemperatura` + toasts | Um único hook gerencia loading/error |
| F6.2 | Integrar tudo em `[id]/page.jsx` | Tela funcional com todas as ações | Fluxo E2E no staging |

---

## 6. Testes

### 6.1 Unit tests (JSDOM via vitest + @testing-library/react)

Precisa adicionar como devDep se não existir:
- `@testing-library/react`
- `@testing-library/jest-dom`
- `happy-dom` (mais rápido que JSDOM)

Cobertura alvo:
- `lib/leadStatus.js` — mapeamentos completos
- `lib/relativeTime.js` — 8 casos de borda
- `lib/apiError.js` — mapeamento de statusCodes
- `lib/permissions.js` — wildcard + match + ausência
- `TemperaturaPicker` — click dispara callback correto
- `LeadStatusBadge` — renderiza cor certa por status
- `CancelLeadDialog` — botão submit disabled até motivo preenchido
- `ReactivateLeadDialog` — dispatch de modo correto

### 6.2 Smoke E2E manual no staging

Sem infra de E2E automatizado hoje — smoke manual é aceitável.

Roteiro mínimo (20 min):
1. Login → editar Lead existente → mudar nome → salvar → sucesso
2. Mudar status via dropdown → "Aguardando Planta/medidas" → preencher data → sucesso → ver evento no histórico
3. Cancelar com motivo → ver status virar Cancelado → botão Cancelar some, aparece Reativar
4. Reativar com modo "reativar" → ver status voltar
5. Reativar com modo "novo" → ver redirect pro novo lead
6. Mudar temperatura → ver badge atualizar + evento no histórico
7. Criar venda → tentar editar sem permissão edit-after-sale → ver inputs disabled + banner

---

## 7. Rollout e segurança

### 7.1 Deploy order

1. Backend já está em staging (feito)
2. Merge desta branch → staging
3. Rodar smoke §6.2 em staging
4. Observar 24h
5. Merge master → produção

### 7.2 Feature flag

Não necessário — as mudanças são bloqueadoras. Se falhar em staging, rollback via git revert antes de promover.

### 7.3 Backward compatibility

- Usuário com browser cached com versão antiga do JS: tenta salvar via PUT antigo → recebe 400. Frontend antigo mostra erro inline. Aceitável (impacto: force reload pra carregar nova versão).
- Next.js App Router faz cache de rotas — forçar rebuild no deploy garante bundle novo.

---

## 8. Pontos de atenção

- ⚠️ **Não é uma auditoria de design.** Mantém padrão visual atual (Tailwind glass-card, slate base). Redesign fica pra outra sprint.
- ⚠️ **Tempo relativo em PT-BR** — escrevo do zero em vez de trazer `dayjs` ou `date-fns` por 1 uso. Se a UI crescer, reconsiderar.
- ⚠️ **Ícones:** `lucide-react` já existe. Usar ícones dessa lib, consistente com o resto do projeto.
- ⚠️ **No-op de temperatura** (quando clica valor atual): o backend retorna `changed: false`. UI não precisa de feedback diferente, mas não deve disparar toast redundante.

---

## 9. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Usuários com browser em cache tentam save antigo | Alta no dia do deploy | Aceito. App Router invalida cache. Nginx `Cache-Control: no-cache` em `/` |
| Histórico com muitos eventos derruba perf | Média | Paginação via cursor (já built-in no backend) |
| Modal de transição exibe estados inválidos | Baixa | Tabela estática em `lib/leadStatus.js`, mesmo mapeamento do backend statusMachine |
| Dark-mode será solicitado depois | Alta | Decisão consciente de escopo — CLAUDE.md pede dark-first, fica pra sprint dedicada |

---

## 10. Definition of Done

- [ ] Todas as 16 tarefas concluídas com PRs mergeadas
- [ ] Fase 1 (F1.1 + F1.2) deployada e validada em staging ANTES de seguir
- [ ] Testes unitários de libs/components críticos verdes
- [ ] Smoke E2E §6.2 executado no staging sem issues
- [ ] 24h em staging sem regressão reportada
- [ ] Merge master após aprovação visual
- [ ] Spec `specs/crm-frontend.md` revisada — nada marcado TBD ficou

---

## 11. Histórico

| Versão | Data | Mudanças |
|---|---|---|
| 1.0.0 | 2026-04-24 | Plano inicial — fechar regressão + consumir backend core |
