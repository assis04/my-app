# Spec: Módulo CRM — Leads

**Módulo:** `crm`
**Status:** active
**Owner:** Thiago (CTO)
**Última revisão:** 2026-04-17
**Versão:** 1.2.0

---

## 1. Propósito

O módulo CRM gerencia o ciclo de vida do **Lead** — uma solicitação de orçamento — desde a captação até o encerramento (conversão em venda, cancelamento, ou perda).

**Um Lead é uma solicitação de orçamento.** Ele pode:
- Evoluir para uma Oportunidade de Negócio (N.O.N.) → orçamento → venda
- Ser descartado/cancelado na triagem inicial
- Parar por falta de retorno do solicitante
- Ser cancelado por desistência do solicitante
- Retornar ao atendimento depois de cancelado

**Objetivo de negócio:** garantir que (a) nenhum Lead se perca, (b) a distribuição entre pré-vendedores/vendedores seja justa e rastreável, (c) cada etapa comercial esteja registrada e auditável, (d) integrações externas (WhatsApp, formulário, Google, Instagram) alimentem a base sem fricção.

**O que este módulo NÃO faz:**
- Não dispara campanhas de marketing (apenas registra origem/canal)
- Não emite orçamento formal nem contrato (apenas referencia a Oportunidade de Negócio)
- Não processa pagamento

---

## 2. Glossário

| Termo | Definição |
|---|---|
| **Lead** | Solicitação de orçamento. Nasce com status **"Em prospecção"**. Pode ou não evoluir para Oportunidade de Negócio. |
| **Account / Conta** | Pessoa física/jurídica com identidade única por `(celular, nome, cep)`. Um Account pode ter N Leads ao longo do tempo. |
| **Oportunidade de Negócio (N.O.N.)** | Orçamento vinculado a um Lead. Um Lead pode gerar **no máximo uma** N.O.N. |
| **Etapa** | Fase macro do Lead no funil: **Prospecção, Negociação, Venda, Pós-venda, Cancelados**. Derivada automaticamente do Status (ver §7.2). |
| **Status** | Estado operacional do Lead (ver §7). Status inicial: **Em prospecção**. |
| **Temperatura** | Nível de engajamento percebido: **Muito interessado, Interessado, Sem interesse**. Definida na tela de edição. |
| **Histórico** | Registro append-only de eventos do Lead (mudanças de status, transferências, agendamentos, notas). |
| **Fila da Vez** | Sistema round-robin por filial para distribuir leads novos entre pré-vendedores/vendedores disponíveis. |
| **Kanban** | Quadro visual de etapas. Cada Lead gera uma etiqueta no Kanban. |
| **Origem externa** | Lead criado por sistema externo (WhatsApp, formulário, Google, Instagram) — sem usuário autenticado. |

---

## 3. Atores e Permissões

| Ator | Permissões principais |
|---|---|
| **Vendedor** | `crm:leads:read` (próprios), `crm:leads:update` (próprios), participa da fila da vez. Ao criar Lead, vira responsável automaticamente. |
| **Pré-vendedor** | `crm:leads:read`, `crm:leads:update` nos leads onde é responsável de pré-venda. Ao criar Lead, vira pré-vendedor responsável automaticamente. |
| **Gerente** | `crm:leads:read` e `crm:leads:update` na filial. Pode criar Lead escolhendo pré-vendedor/vendedor da própria equipe. Pode transferir em massa dentro da filial. |
| **Captação** | `captacao:leads:create` — entrada via fila rápida ou manual. |
| **ADM / Administrador** | Todas as permissões acima + visão global, transferência cross-filial, importação/exportação de listas. |
| **Sistema externo (integração)** | Endpoint público autenticado por API key — cria Lead com pré-vendedor "Não Definido" que entra na fila da vez. |

Autenticação obrigatória em todas as rotas de usuário (`authMiddleware`). RBAC via `authorizeAnyPermission`. Endpoints externos usam autenticação por API key separada.

**Permissões especiais (role-gated):**
- `crm:leads:import` — importar listas (construtoras, corretores, clientes)
- `crm:leads:export` — exportar listas (inclui campos sensíveis como CPF)
- `crm:leads:transfer:bulk` — transferir grupo de leads entre pré-vendedores/vendedores
- `crm:leads:reactivate` — retornar Lead cancelado para atendimento
- `crm:accounts:merge` — fundir Accounts duplicados (apenas ADM)
- `crm:leads:edit-after-sale` — editar Lead após virar "Venda" (apenas ADM)

---

## 4. Entidades

### 4.1 Lead

Registro de oportunidade comercial com identidade, pipeline, atribuições e histórico.

**Campos principais:**
- **Identidade:** `nome` (obrigatório), `sobrenome`, `celular` (obrigatório), `email`, `cpfCnpj`, `cep`, `endereco`
- **Pipeline:** `status` (default `"Em prospecção"`), `etapa` (derivada do status), `kanbanCardId` (FK → `KanbanCard`), `temperatura`, `statusAntesCancelamento` (nullable, usado ao reativar)
- **Imóvel:** `tipoImovel`, `statusImovel`, `plantaPath` (upload), `pedidosContratos`
- **Marketing:** `canal`, `origem`, `parceria`, `origemCanal`, `origemExterna` (bool)
- **Cônjuge:** `conjugeNome`, `conjugeSobrenome`, `conjugeCelular`, `conjugeEmail` *(posição pendente de decisão — ver §12)*
- **Atribuições:** `vendedorId`, `preVendedorId`, `gerenteId`, `filialId`
- **Conta:** `contaId` (nullable — fila pode não ter dados suficientes)
- **Origem:** `fonte` (`crm`, `whatsapp`, `formulario`, `google`, `instagram`)
- **Timestamps:** `createdAt`, `updatedAt`, `deletedAt` (soft delete), `canceladoEm`, `reativadoEm`

**Invariantes:**
- `celular` é sempre normalizado (somente dígitos, 11 chars para BR)
- `status` inicial é sempre `"Em prospecção"` — qualquer outro estado deve ser resultado de transição explícita
- `etapa` é **derivada automaticamente** do status (ver §7.2) — nunca editável manualmente
- `temperatura` é opcional, **sempre manual**; só pode ser definida via tela de edição (não por integração externa nem cálculo automático)
- Soft delete via `deletedAt`; nunca DELETE físico
- Ao cancelar: `statusAntesCancelamento` recebe o status atual, `canceladoEm` preenchido, `status` passa a `"Cancelado"`
- Ao reativar: `reativadoEm` preenchido, `status` volta para `statusAntesCancelamento` (se nulo, default `"Em prospecção"`), histórico registra evento
- Após status `"Venda"`, Lead fica **somente leitura** — apenas ADM com permissão `crm:leads:edit-after-sale` pode editar (caso precise cancelar venda)
- Mudança de `vendedorId` ou `preVendedorId` sempre registra evento no Histórico com autor + timestamp + motivo
- `filialId` herda da filial do responsável (vendedor ou pré-vendedor) quando houver
- Lead de origem externa nasce com `preVendedorId = null` e entra na fila da vez da filial associada

### 4.2 Account

Pessoa por trás de um ou mais Leads. Identidade única por `(celular, nome, cep)`.

**Campos:** `nome`, `sobrenome`, `celular`, `cep`.

**Invariantes:**
- `@@unique([celular, nome, cep])` — duplicatas são proibidas no banco
- Lead novo com identidade igual a Account existente → **reusa o Account**, cria novo Lead
- Account nunca é deletado (histórico comercial preservado)

### 4.3 SalesQueue (Fila da Vez)

Fila round-robin por filial. Chave composta `(filialId, userId)`.

**Campos:** `isAvailable`, `lastAssignedAt`, `attendCount30d`, `position`.

**Invariantes:**
- Apenas usuários com role vendedor podem estar na fila
- `isAvailable=false` exclui da próxima atribuição, mas preserva posição
- `attendCount30d` reseta via job agendado

### 4.4 LeadHistory

Registro append-only de eventos do Lead, exibido na parte inferior da tela de edição.

**Campos:** `leadId`, `authorUserId` (nullable se sistema), `eventType`, `payload` (JSON), `createdAt`.

**Tipos de evento:**
- `status_changed` (from, to)
- `etapa_changed` (from, to)
- `temperatura_changed` (from, to)
- `vendedor_transferred` (fromUserId, toUserId, reason)
- `preVendedor_transferred` (fromUserId, toUserId, reason)
- `agenda_scheduled` (tipo, dataHora)
- `non_generated` (nonId)
- `lead_cancelled` (reason)
- `lead_reactivated`
- `note_added` (text)
- `external_created` (source)

**Invariantes:**
- Append-only — nunca atualiza, nunca deleta
- Ordenado por `createdAt` desc na UI

### 4.5 Oportunidade de Negócio (N.O.N.)

Entidade externa ao módulo (lives em outro módulo de orçamentos), referenciada por `nonId` no Lead.

**Invariantes:**
- Cardinalidade 1:1 (ou 1:0) — cada Lead tem no máximo uma N.O.N.
- A geração de N.O.N. é ação explícita na tela de edição do Lead ou consequência de transições de status específicas (ver §7)

### 4.6 KanbanCard

Entidade interna que representa a etiqueta do Lead no quadro Kanban. Cardinalidade 1:1 com Lead.

**Campos:**
- `id` (PK)
- `leadId` (FK → `Lead`, unique — enforces 1:1)
- `coluna` (etapa atual do Kanban — derivada do status do Lead via §7.2)
- `posicao` (ordenação dentro da coluna)
- `createdAt`, `updatedAt`

**Invariantes:**
- Cada Lead tem **exatamente um** KanbanCard (criado na transação de criação do Lead — ver §6.1)
- `coluna` é mantida em sincronia com o status do Lead: toda transição de status reposiciona o card na coluna correspondente
- KanbanCard é deletado apenas se o Lead for hard-deleted (que não deve acontecer pelo soft delete policy)
- Movimentação manual do card (drag & drop) no Kanban dispara mudança de status do Lead, não o contrário

---

## 5. Telas e Fluxos de UI

### 5.1 Menu: "LEAD"

Item único no menu. Leva para a **Tela de Manutenção de Leads** (não "Manutenção de LEAD" — só "LEAD" na UI).

### 5.2 Tela de Manutenção de Leads

Tela principal unificada com três seções:

**Seção 1 — Filtros inteligentes (componíveis):**
Filtros que se empilham (AND) conforme o usuário seleciona.

| Filtro | Valores |
|---|---|
| Nome do Lead | texto livre |
| Data | Dia / Mês / Ano / Período específico |
| Status do LEAD | enum (ver §7) |
| Etapa do LEAD | Prospecção, Negociação, Venda, Pós-venda, Cancelados |
| Pré-vendedor | lookup |
| Vendedor | lookup |
| Loja (Filial) | lookup |
| Canal | enum |
| Origem | enum |

**Seção 2 — Faixa de botões (abaixo dos filtros):**
- **Novo LEAD** → abre tela de cadastro (campos obrigatórios mínimos)
- **Nova Oportunidade de Negócio** → abre tela de cadastro de N.O.N. direta
- **Importar Lista** → (role-gated, `crm:leads:import`)
- **Exportar Lista** → exporta os leads filtrados em CSV ou Excel (role-gated, `crm:leads:export`) — ver §5.5
- **Transferir Responsável Pré-venda** → transferência em massa (role-gated)
- **Transferir Responsável Vendedor** → transferência em massa (role-gated)

**Seção 3 — Lista de Leads:**
Ordenada por data, mais recente no topo. Cada linha contém:

| Posição | Elemento |
|---|---|
| Início da linha | Ícone de **temperatura** (Muito interessado / Interessado / Sem interesse) |
| Colunas intermediárias | Nome, Data, Status, Etapa, **Pré-vendedor** (dropdown editável se "Não Definido"), Vendedor, Loja |
| Final da linha | Botões: **Editar** \| **Cancelar** \| **N.O.N.** |

**Comportamento do campo "Pré-vendedor" na lista:**
- Se Lead veio de origem externa, inicia como **"Não Definido"** → dropdown com pré-vendedores disponíveis da filial (lógica similar à Fila da Vez)
- Se Lead veio de usuário do sistema:
  - Autor = gerente → pode escolher pré-vendedor/vendedor da própria equipe
  - Autor = vendedor → preenche automaticamente com o próprio vendedor
  - Autor = pré-vendedor → preenche automaticamente com o próprio pré-vendedor

### 5.3 Tela de Edição de LEAD

Acessada pelo botão **Editar** de cada linha. Nela é possível:
- Editar campos conforme perfil/permissão
- Alterar **Status** (dispara side-effects — ver §7)
- Incluir entradas no **Histórico**
- Solicitar cancelamento
- Definir **Temperatura**
- Gerar **N.O.N.**
- Definir **nova Etapa**: videochamada, visita na loja, data/hora na agenda

**Regra:** o que cada perfil pode editar é controlado por `crm:leads:update` + permissões granulares futuras (ex: só gerente muda filial).

### 5.4 Tela de Cadastro de Lead

Campos obrigatórios + dois botões principais:
- **Salvar** → aciona lógica de criação (ver §6.1)
- **Nova Oportunidade de Negócio** → salva o Lead e encaminha direto pra criação de N.O.N.

### 5.5 Exportação de Lista

Ação acionada pelo botão **Exportar Lista** na Tela de Manutenção de Leads.

- **Permissão:** `crm:leads:export`
- **Escopo:** exporta exatamente os Leads atualmente filtrados na lista (mesma query da listagem)
- **Formatos:** CSV e Excel (usuário escolhe)
- **Seleção de campos:** UI apresenta checkbox das colunas disponíveis — usuário escolhe quais incluir. Default: todas as colunas visíveis na lista
- **Campos sensíveis:** CPF/CNPJ e email podem ser incluídos, mas a seleção é logada em auditoria (evento `leads_exported` no log de segurança, com autor, quantidade, campos selecionados)
- **Limite:** export > 10.000 linhas roda de forma assíncrona (job queue) e envia o arquivo por download quando pronto

### 5.6 Tela de Merge de Accounts

Ação administrativa para fundir Accounts duplicados (ex: "Thiago Lucas" e "Thiago Lucas Silva" com mesmo celular).

- **Permissão:** `crm:accounts:merge` (apenas ADM)
- **Acesso:** sub-tela no módulo de Accounts ou ação na tela de detalhe de Account
- **Fluxo:**
  1. ADM seleciona Account **sobrevivente** (o que permanecerá) e N Accounts **a fundir**
  2. Sistema exibe preview: quantos Leads, quais campos divergentes, qual será o resultado
  3. ADM confirma → transação atômica:
     - Todos os Leads dos Accounts fundidos migram para o sobrevivente (`contaId` atualizado)
     - Accounts fundidos são marcados com `mergedIntoId` (não deletados — mantém trilha de auditoria)
     - `LeadHistory` de cada Lead migrado registra evento `account_merged` com fromAccountId → toAccountId
  4. Resposta: resumo com total de Leads migrados

**Invariantes:**
- Account sobrevivente preserva sua identidade `(celular, nome, cep)` — nenhum campo é sobrescrito pelo fundido
- Accounts fundidos ficam read-only (não aparecem em buscas novas, mas seu ID continua válido para auditoria histórica)

---

## 6. Fluxos principais

### 6.1 Criação de Lead (botão Salvar) — fluxo canônico

1. Validar schema
2. Normalizar celular
3. **Busca Account por `(celular, nome, cep)`:**
   - Existe → reusa `contaId`
   - Não existe → cria novo Account com os dados do Lead, obtém `contaId`
4. Criar Lead com `status="Em prospecção"`, `etapa="Prospecção"` (derivada), `contaId` preenchido
5. Atribuir responsável conforme §5.2 (autor do cadastro ou fila da vez)
6. **Criar `KanbanCard`** com `leadId` preenchido, `coluna="Prospecção"` — na mesma transação do Lead
7. Registrar no `LeadHistory`: evento `external_created` (se origem externa) ou nota de criação interna

**Critérios de aceitação:**
- ✅ Account reutilizado se identidade bate
- ✅ Account novo criado se identidade é nova
- ✅ Retorna 201 com `{ lead, account, kanbanId }`
- ✅ Retorna 422 se validação falhar
- ✅ Kanban é criado em transação com o Lead — se Kanban falhar, Lead não é criado

### 6.2 Criação via Fila da Vez (lead rápido — captação)

**Endpoint:** `POST /api/crm/lead/quick`

1. Fluxo §6.1
2. Seleciona próximo pré-vendedor/vendedor disponível da fila da filial
3. Atribui `preVendedorId` (e `vendedorId` conforme regra)
4. Atualiza posição da fila e `attendCount30d`

**Critérios de aceitação:**
- ✅ Lead com responsável atribuído via fila
- ✅ Retorna 409 se todos os responsáveis da filial estão indisponíveis
- ✅ Upload de planta opcional — falha no upload não bloqueia criação

### 6.3 Criação por sistema externo (WhatsApp, Form, Google, Instagram)

**Endpoint:** `POST /api/crm/lead/external` — autenticação por API key

1. Fluxo §6.1 com `origemExterna=true` e `fonte` conforme o canal
2. `preVendedorId = null` inicialmente
3. Lead entra na lista como **"Não Definido"** no campo pré-vendedor
4. Histórico registra `external_created` com a fonte

### 6.4 Transferência de responsável

**Endpoints:**
- `PUT /api/crm/leads/transfer-prevendedor` — individual ou em massa
- `PUT /api/crm/leads/transfer-vendedor` — individual ou em massa

**Fluxo:**
1. Validar permissão (gerente só transfere dentro da filial; ADM qualquer lugar)
2. Transação atômica — todos ou nenhum
3. Registrar evento no `LeadHistory` para cada Lead transferido com autor, timestamp, motivo

**Critérios de aceitação:**
- ✅ Gerente NÃO transfere lead de outra filial (403)
- ✅ Destino DEVE ser responsável ativo da filial correta (400 caso contrário)
- ✅ `LeadHistory` tem uma entrada por Lead movimentado

### 6.5 Cancelamento e Reativação

**Cancelar** — disponível para qualquer responsável (vendedor, pré-vendedor, gerente, ADM):
1. Validar permissão `crm:leads:update`
2. Guardar status atual em `statusAntesCancelamento`
3. Mudar `status` para `"Cancelado"`, preencher `canceladoEm`
4. Registrar motivo no `LeadHistory` (evento `lead_cancelled` — motivo obrigatório)
5. Etapa fica `"Cancelados"` (derivada do status)
6. Mover `KanbanCard` para coluna `"Cancelados"`

**Retornar LEAD para Atendimento** (botão específico — role-gated `crm:leads:reactivate`):

Ao clicar, a UI apresenta **escolha** ao usuário:

- **Opção A — Reativar o Lead existente:**
  1. `reativadoEm` preenchido
  2. `status` volta para `statusAntesCancelamento` (ou `"Em prospecção"` se nulo)
  3. `KanbanCard` movido para a coluna correspondente
  4. `LeadHistory` registra `lead_reactivated`

- **Opção B — Criar novo Lead vinculado ao mesmo Account:**
  1. Lead cancelado permanece cancelado (preserva histórico do ciclo anterior)
  2. Novo Lead criado via fluxo §6.1, reutilizando `contaId`
  3. Novo `KanbanCard` criado
  4. `LeadHistory` do Lead antigo registra `reactivated_as_new_lead` com ponteiro para o novo
  5. `LeadHistory` do novo Lead registra `created_from_reactivation` com ponteiro para o antigo

A escolha padrão na UI depende do tempo desde o cancelamento (sugestão: > 90 dias → recomendar Opção B), mas a decisão final é sempre do usuário.

### 6.6 Importar Lista

**Endpoint:** `POST /api/crm/leads/import` — role-gated `crm:leads:import`

1. Aceita CSV/Excel com schema pré-definido (construtoras, corretores, clientes)
2. Para cada linha, executa fluxo §6.1
3. Retorna relatório: `{ criados, reutilizados, ignorados, erros[] }`

---

## 7. Status do Lead — máquina de estados

### 7.1 Status e side-effects

O status é uma bússola visual e comportamental. Mudanças de status disparam **side-effects automáticos**.

| Status | Descrição | Side-effects ao entrar nesse status |
|---|---|---|
| **Em prospecção** | Status inicial. Nenhuma interação ainda. Aguarda ação do responsável. | — (estado inicial) |
| **Aguardando Planta/medidas** | Responsável precisa coletar planta/medidas do cliente. | Abre agenda → insere ação com data/hora → grava lembrete → registra no Histórico ("Agendado contato para pegar planta/medida para dia X hora Y") |
| **Agendado vídeo chamada** | Videochamada marcada. | Abre tela de N.O.N. (se ainda não houver) → abre agenda → move `KanbanCard` → registra Histórico |
| **Agendado visita na loja** | Cliente virá à loja. | Se não há N.O.N., cria uma → move `KanbanCard` → abre agenda → registra Histórico |
| **Em Atendimento Loja** | Cliente chegou, atendimento em curso. | Move `KanbanCard` → registra Histórico |
| **Cancelado** | Cancelado por desistência, triagem, ou falta de retorno. | Preenche `statusAntesCancelamento` e `canceladoEm` → move `KanbanCard` → registra motivo no Histórico |
| **Venda** | Converteu em venda. | Move `KanbanCard` para coluna "Venda" → Lead fica **read-only para todos exceto ADM** com `crm:leads:edit-after-sale` (pois venda pode ser cancelada) |
| **Pós-venda** | Venda concluída, acompanhamento. | Move `KanbanCard` para coluna "Pós-venda" |

**Invariantes de transição:**
- `"Em prospecção"` → qualquer outro status é transição válida
- `"Cancelado"` → qualquer outro status só via fluxo de **Reativação** (§6.5, role-gated)
- `"Venda"` → `"Pós-venda"` ou `"Cancelado"` (quando venda é cancelada)
- `"Pós-venda"` é terminal — só transiciona para `"Cancelado"` em caso de cancelamento de venda (raro)
- Toda transição gera evento `status_changed` no Histórico com autor e timestamp

### 7.2 Mapeamento Status → Etapa (derivação automática)

A **Etapa** não é editável manualmente. Ela é sempre derivada do Status atual:

| Status | Etapa derivada |
|---|---|
| Em prospecção | **Prospecção** |
| Aguardando Planta/medidas | **Prospecção** |
| Agendado vídeo chamada | **Negociação** |
| Agendado visita na loja | **Negociação** |
| Em Atendimento Loja | **Negociação** |
| Venda | **Venda** |
| Pós-venda | **Pós-venda** |
| Cancelado | **Cancelados** |

Toda mudança de status recalcula `etapa` e reposiciona o `KanbanCard` na coluna correspondente **na mesma transação**.

---

## 8. API — contrato resumido

Prefixo: `/api/crm` | Autenticação: `authMiddleware` em rotas de usuário | API key em rotas externas | Validação: `validate()` por schema

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/orcamentos` | auth | Lista orçamentos (read-only, cross-módulo) |
| GET | `/queue/:branch_id` | auth | Estado atual da fila da filial |
| POST | `/lead/quick` | `captacao:leads:create` | Captura rápida via fila |
| POST | `/lead/manual` | `captacao:leads:create` | Criação manual com responsável explícito |
| POST | `/lead/external` | API key | Criação por sistema externo |
| PUT | `/queue/toggle-status` | auth | Altera disponibilidade na fila |
| GET | `/history` | auth | Histórico de leads do usuário |
| GET | `/leads` | `crm:leads:read` | Lista (com filtros §5.2) |
| GET | `/leads/:id` | `crm:leads:read` | Detalhe do Lead + Histórico |
| POST | `/leads` | `crm:leads:create` | Cria Lead (fluxo CRM) |
| PUT | `/leads/:id` | `crm:leads:update` | Atualiza Lead |
| PUT | `/leads/:id/status` | `crm:leads:update` | Muda status (dispara side-effects §7) |
| PUT | `/leads/:id/temperatura` | `crm:leads:update` | Define temperatura |
| PUT | `/leads/:id/cancel` | `crm:leads:update` | Cancela com motivo |
| PUT | `/leads/:id/reactivate` | `crm:leads:reactivate` | Reativa Lead cancelado |
| POST | `/leads/:id/non` | `crm:leads:update` | Gera Oportunidade de Negócio |
| POST | `/leads/:id/history` | `crm:leads:update` | Adiciona nota ao Histórico |
| DELETE | `/leads/:id` | `crm:leads:delete` | Soft delete |
| PUT | `/leads/transfer-prevendedor` | `crm:leads:transfer:bulk` | Transfere N leads entre pré-vendedores |
| PUT | `/leads/transfer-vendedor` | `crm:leads:transfer:bulk` | Transfere N leads entre vendedores |
| PUT | `/leads-etapa` | `crm:leads:update` | Altera etapa/kanban |
| POST | `/leads/import` | `crm:leads:import` | Importa lista (CSV/Excel) |
| POST | `/leads/export` | `crm:leads:export` | Exporta lista filtrada (CSV/Excel, campos selecionados) |
| GET | `/accounts` | `crm:accounts:read` | Lista contas |
| GET | `/accounts/:id` | `crm:accounts:read` | Detalhe de conta + leads |
| POST | `/accounts/merge` | `crm:accounts:merge` | Funde N Accounts em 1 sobrevivente (§5.6) |

---

## 9. Regras de negócio críticas

1. **Identidade de Account é imutável** — `(celular, nome, cep)` é a chave. Lead novo com mesma identidade reusa Account.
2. **Todo Lead nasce com status "Em prospecção" e etapa "Prospecção"**, sem exceção.
3. **Etapa é sempre derivada do Status** (§7.2) — nunca editável manualmente.
4. **Um Lead → no máximo uma N.O.N.** Cardinalidade estrita.
5. **Fila da Vez é FIFO estável e atômica** — duas capturas simultâneas nunca atribuem o mesmo responsável. Usar **Redis lock distribuído** (sistema será escalado horizontalmente).
6. **Soft delete preserva histórico** — `deletedAt` remove da listagem mas mantém pra auditoria.
7. **Isolamento por filial** — gerente nunca vê leads de outra filial. Só ADM vê tudo.
8. **Toda mudança de responsável/status/temperatura gera evento no LeadHistory.** LeadHistory é append-only.
9. **Lead órfão é inválido** — sempre tem pelo menos uma atribuição (vendedor, pré-vendedor, ou gerente).
10. **Reativação de cancelado é role-gated** — não é simples update de status. UI oferece escolha entre reativar existente ou criar novo Lead (§6.5).
11. **Side-effects de status são garantidos pela API** — UI não pode pular a transição canônica. Mudança de status via endpoint dedicado (`PUT /leads/:id/status`).
12. **KanbanCard é criado transacionalmente com o Lead** — nunca fica órfão.
13. **Temperatura é sempre manual** — não há cálculo automático; origem externa nunca define temperatura.
14. **Após status "Venda", Lead é read-only exceto para ADM** com permissão `crm:leads:edit-after-sale` (usada quando venda precisa ser cancelada).
15. **Cancelar é universal** — qualquer responsável (vendedor, pré-vendedor, gerente, ADM) pode cancelar. Reativar é role-gated.
16. **Merge de Accounts é ADM-only** — preserva Account sobrevivente intacto, fundidos ficam read-only com `mergedIntoId` (nunca deletados).
17. **Export com campos sensíveis (CPF, email) é auditado** — evento de segurança com autor, campos selecionados e quantidade.

---

## 10. Não-funcionais

- **Performance:** listagem com filtro responde em < 300ms p95 para até 100k leads por filial. Índices em `vendedorId`, `preVendedorId`, `gerenteId`, `filialId`, `contaId`, `status`, `createdAt`, `temperatura`.
- **Concorrência na fila:** **Redis lock distribuído obrigatório** — sistema será escalado horizontalmente. SELECT FOR UPDATE apenas como fallback em ambiente single-instance de dev.
- **Upload de planta:** máximo 10MB. Formatos: `pdf`, `jpg`, `png`. Armazenado em `/app/uploads`.
- **Auditoria:** toda alteração de `vendedorId`, `preVendedorId`, `status`, `temperatura` registrada em `LeadHistory`. Exports com campos sensíveis geram evento em log de segurança separado.
- **Segurança:** rate limit global (200 req/15min por IP). CORS restrito. API key rotacionável pra endpoints externos.
- **Integração externa:** endpoints `/lead/external` têm rate limit próprio (mais restrito) e API key dedicada por canal.
- **Import de lista:** processamento assíncrono via job queue (BullMQ + Redis) quando > 1000 linhas. *Limite máximo por import pendente de decisão — ver §12.*
- **Export de lista:** síncrono até 10.000 linhas; acima disso, job assíncrono que gera arquivo e notifica o usuário quando pronto.

---

## 11. Dependências

- **Módulo Auth** — fornece `authMiddleware`, `req.user`
- **Módulo RBAC** — fornece `authorizeAnyPermission`
- **Módulo Filial** — `filialId` referencia entidade externa
- **Módulo User** — `vendedorId`, `preVendedorId`, `gerenteId` referenciam entidade externa
- **Módulo Agenda** — cria eventos de agenda a partir de transições de status
- **Módulo Kanban** — cria/move etiquetas a partir de eventos do Lead
- **Módulo Orçamentos (N.O.N.)** — ponto de integração para geração de Oportunidade de Negócio
- **Módulo Integrações Externas** — recebe webhooks de WhatsApp, formulário, Google, Instagram
- **Prisma** — ORM único
- **Redis** — lock distribuído na fila, cache de listagem

---

## 12. Decisões pendentes (TBD)

### Ainda em aberto

- 🔴 **Webhooks externos — provedor e schema por canal:**
  - WhatsApp: qual provedor? (Twilio / Z-API / 360dialog / Meta Cloud API)
  - Formulário: qual ferramenta? (site próprio / Typeform / Google Forms / RD Station)
  - Google: Google Ads Lead Form / GMB / outro?
  - Instagram: Meta Lead Ads / DM automation?
  - **Bloqueia:** implementação dos endpoints `/lead/external` por canal.

- 🟡 **Posição dos campos de cônjuge:** hoje estão em `Lead` (por herança do sistema atual). Como cônjuge é atributo da pessoa, não da solicitação, **faz mais sentido migrar pra `Account`**. Decisão pendente.

- 🟡 **Limite máximo de linhas no import de lista:** define se precisa de paginação/streaming vs carregar tudo em memória. Proposta default: **50.000 linhas** por job.

### Decisões resolvidas (histórico)

- ✅ **Merge de Accounts duplicados** → tela admin-only, tudo migra pro sobrevivente (§5.6)
- ✅ **Lock da Fila da Vez** → Redis lock distribuído obrigatório (sistema escalará horizontalmente)
- ✅ **Temperatura** → manual apenas, sem ML
- ✅ **Retorno de LEAD cancelado** → volta pro `statusAntesCancelamento` (Opção B, §6.5)
- ✅ **Exportação de lista** → CSV e Excel, campos selecionados via checkbox sobre filtros ativos, inclui CPF (com auditoria), permissão `crm:leads:export`
- ✅ **Reativação vs novo Lead** → usuário escolhe na UI (Opção C — §6.5 oferece ambas)
- ✅ **Status terminais** → "Venda" (removido "Ganho") e "Pós-venda"
- ✅ **Edição após Venda** → permitida apenas para ADM com `crm:leads:edit-after-sale` (venda pode ser cancelada)
- ✅ **Etapa derivada do Status** → mapeamento automático §7.2, Etapa nunca editável manualmente
- ✅ **Kanban interno** → entidade `KanbanCard` (FK int), 1:1 com Lead, criada transacionalmente (§4.6)
- ✅ **Permissão para cancelar** → todos os responsáveis (vendedor, pré-vendedor, gerente, ADM)
- ✅ **Perfil "Captação"** → confirmado que existe no sistema

---

## 13. Critérios de "feito" para qualquer mudança neste módulo

- [ ] Spec atualizada **antes** do código
- [ ] Validação de schema no controller
- [ ] Permissão RBAC explícita na rota
- [ ] Side-effects de status implementados via transação atômica
- [ ] Evento registrado no `LeadHistory` para qualquer mudança de campo crítico
- [ ] Teste de integração cobrindo caminho feliz + 2 edge cases
- [ ] Sem quebra de invariantes (§4)
- [ ] Sem quebra de permissões (§3)
- [ ] Migração Prisma se alterou schema
- [ ] Documentação de webhook externo atualizada se mudou contrato externo

---

## 14. Histórico de revisões

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| 1.0.0 | 2026-04-17 | Thiago | Primeira versão formal — extraída do código existente |
| 1.1.0 | 2026-04-17 | Thiago | Integração dos requisitos de produto: definição de Lead como solicitação de orçamento, status "Em prospecção" como inicial, etapas canônicas (Prospecção, Negociação, Venda, Pós-venda, Cancelados), Temperatura, N.O.N., LeadHistory, Agenda, Kanban transacional, máquina de estados com side-effects, fluxos externos (WhatsApp/Form/Google/Instagram), reativação de cancelado, importação/exportação de listas, transferência em massa |
| 1.2.0 | 2026-04-17 | Thiago | Resolução das decisões pendentes: merge de Accounts admin-only, Redis lock obrigatório (escala horizontal), temperatura 100% manual, status "Venda" (removido "Ganho"), Etapa derivada automaticamente do Status (§7.2), entidade `KanbanCard` com FK interna, `statusAntesCancelamento` para reativação, edição pós-venda ADM-only, cancelamento universal (todos responsáveis), reativação com escolha UI (reativar vs novo Lead), export com checkbox de campos + auditoria de CPF, permissões granulares novas (`export`, `merge`, `edit-after-sale`). TBDs remanescentes: webhooks externos por canal, posição dos campos de cônjuge, limite de import. |
