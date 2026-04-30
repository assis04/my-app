# Plano Técnico: Correção dos Findings do QA

**Spec de referência:** Relatório `/hm-qa` rodado em 2026-04-28 (este documento é a resposta executável).
**Escopo:** fechar todos os 9 issues levantados pelo QA — 1 HIGH, 2 MED, 6 LOW.
**Versão:** 1.0.0 · **Data:** 2026-04-28

---

## 1. Sumário Executivo

429/429 testes passando, 0 vulnerabilidades HIGH/CRITICAL em deps de runtime, base sólida. Os 9 findings são **polimentos** para chegar ao padrão world-class. Plano dividido em 3 fases:

| Fase | Itens | Bloqueante? | Esforço |
|---|---|---|---|
| **P0 — Antes do próximo deploy** | #1 magic-byte upload, #2 IDOR `/uploads`, #5 `/users` scope | Sim, se `/uploads` for exposto a qualquer cliente externo | 6–9h |
| **P1 — Próximo sprint (até 2 semanas)** | #3 Prisma migrate baseline, #4 alarme Redis, #6 CSP, #7 dep bumps | Não, mas dívida técnica acumula | 5–7h |
| **P2 — Backlog (próximo mês)** | #8 a11y sweep, #9 E2E Playwright | Não | 12–20h |

**Total ~25–35h** de trabalho técnico, sem refator de produto.

---

## 2. Decisões de arquitetura transversais

### 2.1 Validação de uploads — magic-byte via `file-type`

Adicionar dependência `file-type@^21` (ESM, sem deps nativas, mantida pelo sindresorhus). Validação acontece **depois** do `multer.diskStorage` salvar — se rejeitar, o handler apaga o arquivo (`fs.unlink`) antes do controller executar. Isso evita parser dobrado e mantém o `fileFilter` como primeira barreira (rejeita ext óbvia antes de gravar).

### 2.2 Serving de uploads — controller dedicado, não `express.static`

O `express.static` é DEAD code do ponto de vista de segurança: ele serve qualquer arquivo presente em `uploads/` sem checagem de ownership. Substituir por endpoint `GET /api/crm/leads/:id/planta` que:
1. roda `authMiddleware` + `authorizeAnyPermission(['crm:leads:read'])`
2. carrega o Lead via `leadCrmService.getLeadById(id, req.user)` (já faz filial isolation)
3. valida que o `plantaPath` resolve dentro de `uploads/plantas/` (path traversal guard)
4. responde com `res.sendFile()` + headers `Content-Disposition: inline; filename="planta-{id}.{ext}"` e `X-Content-Type-Options: nosniff`

Frontend troca `<img src="/uploads/plantas/<file>">` por `<img src="/api/crm/leads/<id>/planta">`. URL pública passa a ser **opaca** — não revela filename gerado.

### 2.3 Endpoint `/users/lookup` — princípio de menor exposição

Manter `GET /users` (lista completa) mas gate-ar com `rh:usuarios:read`. Criar `GET /users/lookup?filialId=&role=` retornando só `{ id, nome }` para qualquer autenticado preencher `<select>`. Filtros server-side por filial e role pra reduzir payload.

### 2.4 Prisma migrate — baseline sem dor

Estratégia padrão Prisma para projetos "born from `db push`":
1. `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`
2. Em cada ambiente: `prisma migrate resolve --applied 0_init` (marca como já rodada — não executa SQL)
3. Daqui pra frente: novo schema → `prisma migrate dev --name <descrição>` em dev → commit → `prisma migrate deploy` em prod (substitui `db push`)

Migration baseline cobre o schema atual em peso. Nenhum dado é tocado. Próximas migrations virão com history e rollback (down via revert + nova migration).

### 2.5 CSP — restritiva, sem `unsafe-inline`

Stack atual (Next 16, Tailwind v4 class-based, lucide-react SVG inline, recharts SVG, socket.io) **não usa inline styles nem inline scripts**. Pode-se adotar CSP estrita já. `connect-src` lê `NEXT_PUBLIC_API_URL` em build-time pra incluir o backend. WebSocket usa o mesmo host (Traefik proxy) — `wss:` cobre.

---

## 3. Fase P0 — Antes do próximo deploy

### Task #1 — Validação magic-byte no upload de planta `[HIGH]`

**Estado atual:** [`backend/src/middlewares/uploadMiddleware.js:21-32`](backend/src/middlewares/uploadMiddleware.js#L21-L32)

```js
const allowedTypes = /jpeg|jpg|png|pdf/;
const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedTypes.test(file.mimetype);
if (extname && mimetype) return cb(null, true);
```

`file.mimetype` vem do header HTTP do cliente — manipulável. Atacante envia `Content-Type: application/pdf` com payload HTML, ext `.pdf`, e o arquivo é gravado e servido.

**Diagnóstico:** entropia de filename (~44 bits via `Date.now() + Math.random()*1e9`) atrasa enumeração mas não previne. Combinado com #2, qualquer autenticado consegue baixar arquivos de qualquer filial. Risco efetivo: XSS armazenado se o navegador fizer MIME-sniff (mitigado pelo `nosniff` que vamos adicionar em #2, mas ainda assim payload PDF malicioso é vetor).

**Solução:**

1. `npm install file-type@^21 --prefix backend`
2. Refatorar `uploadMiddleware.js`:
   - Manter `fileFilter` atual como guarda barata (rejeita ext óbvia antes de gravar)
   - Adicionar middleware `validateUploadedFileMagicBytes` que roda **depois** do multer:
     ```js
     export async function validateUploadedFileMagicBytes(req, res, next) {
       if (!req.file) return next();
       const { fileTypeFromFile } = await import('file-type');
       const detected = await fileTypeFromFile(req.file.path);
       const allowed = new Set(['image/jpeg', 'image/png', 'application/pdf']);
       if (!detected || !allowed.has(detected.mime)) {
         await fs.promises.unlink(req.file.path).catch(() => {});
         return res.status(400).json({ message: 'Arquivo inválido — tipo não permitido (ou arquivo corrompido).' });
       }
       next();
     }
     ```
3. Wirar nos dois endpoints em [`crmRoutes.js:26-27`](backend/src/routes/crmRoutes.js#L26-L27):
   ```js
   router.post('/lead/quick',
     authMiddleware, authorizeAnyPermission([...]),
     uploadPlanta.single('planta'), validateUploadedFileMagicBytes,
     validate(quickLeadSchema), leadController.processNewQuickLead);
   ```

**Arquivos:**
- `backend/package.json` (+1 dep)
- `backend/src/middlewares/uploadMiddleware.js`
- `backend/src/routes/crmRoutes.js` (2 linhas)

**Testes:**
- `backend/src/__tests__/uploadMiddleware.test.js` (novo): mock de `file-type`, testar que rejeita HTML disfarçado, aceita PDF/JPEG/PNG legítimos, deleta arquivo em rejeição. ~5 testes.

**Estimativa:** 2h.

---

### Task #2 — IDOR fix em `/uploads` `[MED]`

**Estado atual:** [`backend/server.js:48`](backend/server.js#L48)

```js
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));
```

Qualquer autenticado pode `GET /uploads/plantas/planta-1714330156000-456789012.pdf` se conhecer o filename. Filenames são retornados em `GET /api/crm/leads/:id` (campo `plantaPath`), que **tem** filial isolation — mas a porta `/uploads` direta **não**.

**Solução:**

1. Remover [`server.js:46-48`](backend/server.js#L46-L48) (express.static pra `/uploads`).
2. Adicionar rota nova em `backend/src/routes/crmRoutes.js`:
   ```js
   router.get('/leads/:id/planta',
     authMiddleware,
     authorizeAnyPermission(['crm:leads:read', 'ADM', 'Administrador']),
     leadCrmController.getPlanta);
   ```
3. Implementar `getPlanta` em `leadCrmController.js`:
   ```js
   export async function getPlanta(req, res, next) {
     try {
       const lead = await leadCrmService.getLeadById(req.params.id, req.user);
       if (!lead.plantaPath) return res.status(404).json({ message: 'Lead sem planta anexada.' });

       const uploadsRoot = path.resolve('uploads', 'plantas');
       const filePath = path.resolve(lead.plantaPath);
       if (!filePath.startsWith(uploadsRoot + path.sep)) {
         return res.status(400).json({ message: 'Caminho inválido.' });
       }
       if (!fs.existsSync(filePath)) {
         return res.status(404).json({ message: 'Arquivo não encontrado em disco.' });
       }

       res.setHeader('X-Content-Type-Options', 'nosniff');
       res.setHeader('Content-Disposition', `inline; filename="planta-${lead.id}${path.extname(filePath)}"`);
       res.sendFile(filePath);
     } catch (error) {
       next(error);
     }
   }
   ```
4. **Frontend:** trocar todas as ocorrências de URL direta `/uploads/...` por `/api/crm/leads/<id>/planta`. Procurar em `front/src/app/crm/**/*.jsx` por `plantaPath` e o template `<img src=` ou `<embed src=` que o consome.

**Arquivos:**
- `backend/server.js`
- `backend/src/routes/crmRoutes.js`
- `backend/src/controllers/leadCrmController.js`
- `front/src/app/crm/leads/[id]/page.jsx` (provável)
- `front/src/services/crmApi.js` (helper `getPlantaUrl(leadId)`)

**Testes:**
- `backend/src/__tests__/leadCrmController.getPlanta.test.js` (novo): 404 quando lead não tem planta, 403 cross-filial, 400 path-traversal, 200 success. ~5 testes.

**Estimativa:** 3h (inclui ajuste do frontend).

---

### Task #5 — `/users` scope + endpoint `/users/lookup` `[LOW→tratado em P0 por ser barato]`

**Estado atual:** [`backend/src/routes/userRoutes.js:11`](backend/src/routes/userRoutes.js#L11)

```js
router.get('/', authMiddleware, listUsers);
```

Comentário "usado nos selects do frontend" — qualquer autenticado lista todos os usuários (incluindo email, filial, role). 8 lugares no front consomem.

**Solução:**

1. Criar `backend/src/services/userService.js` → função `listUsersForLookup({ filialId, role })`:
   ```js
   export async function listUsersForLookup({ filialId, role } = {}) {
     const where = { ativo: true, deletedAt: null };
     if (filialId) where.filialId = parseInt(filialId, 10);
     if (role) where.role = { nome: role };
     return prisma.user.findMany({
       where,
       select: { id: true, nome: true, filialId: true },
       orderBy: { nome: 'asc' },
     });
   }
   ```
2. Adicionar em `userController.js` → `lookupUsers`.
3. Em `userRoutes.js`:
   ```js
   router.get('/lookup', authMiddleware, lookupUsers);
   router.get('/', authMiddleware, authorizePermission('rh:usuarios:read'), listUsers);
   ```
4. **Frontend:** trocar 8 chamadas `api('/users')` por `api('/users/lookup')` ou `api('/users/lookup?filialId=X&role=vendedor')`:
   - `front/src/app/rh/gerenciar-usuarios/page.jsx` — **mantém `/users`** (precisa dos campos completos)
   - `front/src/app/crm/leads/page.jsx`, `novo/page.jsx`, `[id]/page.jsx` — `/users/lookup?role=vendedor` ou `?role=pre_vendedor`
   - `front/src/app/crm/oportunidade-de-negocio/page.jsx` — `/users/lookup?role=vendedor`
   - `front/src/app/rh/filiais/components/FilialModal.jsx` — `/users/lookup?role=gerente`
   - `front/src/app/crm/fila-da-vez/components/NovoLeadModal.jsx` — `/users/lookup?filialId=X&role=vendedor`
   - `front/src/app/rh/equipes/components/EquipeModal.jsx` — `/users/lookup?filialId=X`

**Arquivos:**
- `backend/src/services/userService.js` (+1 função)
- `backend/src/controllers/userController.js` (+1 handler)
- `backend/src/routes/userRoutes.js` (+1 rota, gate em `/`)
- 7 arquivos no front (substituição mecânica)

**Testes:**
- `backend/src/__tests__/userService.lookup.test.js` (novo): 4 testes — sem filtro, filtro por filialId, filtro por role, ambos.
- Atualizar `crmRoutes.security.test.js` se houver assertion sobre `userRoutes`.

**Estimativa:** 2.5h.

**Por que P0 e não P2:** o fix é barato e fecha vazamento de PII (emails internos da empresa). Não custa nada agendar junto.

---

## 4. Fase P1 — Próximo sprint

### Task #3 — Migrar `db push` → `prisma migrate` com baseline `[MED]`

**Estado atual:** Nenhum diretório `backend/prisma/migrations/`. Deploy usa `npx prisma db push` (memory `feedback_deploy_schema_order.md`). Em produção, schema vivo é o resultado de N comandos `db push` históricos sem auditoria.

**Plano de baseline (faseado, sem downtime):**

**Etapa 1 — Em dev local:**
```bash
cd backend
mkdir -p prisma/migrations/0_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
```

Inspecionar o SQL gerado. Confirmar que reflete fielmente o schema (todos os models, índices, FKs).

**Etapa 2 — Adicionar `migration_lock.toml`:**
```toml
provider = "postgresql"
```
em `backend/prisma/migrations/migration_lock.toml`.

**Etapa 3 — Marcar como aplicada em **cada ambiente**** (staging primeiro, depois prod):
```bash
DATABASE_URL=<staging-url> npx prisma migrate resolve --applied 0_init
DATABASE_URL=<prod-url>    npx prisma migrate resolve --applied 0_init
```

Esse comando só insere uma linha em `_prisma_migrations` — não toca dados nem schema.

**Etapa 4 — Atualizar fluxo de deploy:**
- Substituir `npx prisma db push` por `npx prisma migrate deploy` no script de deploy do VPS.
- Atualizar memory `feedback_deploy_schema_order.md` para refletir o novo fluxo (rebuild → `migrate deploy` → restart).

**Etapa 5 — Adicionar npm scripts em `backend/package.json`:**
```json
{
  "scripts": {
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

**Etapa 6 — Partial unique index do `crm-non-plan.md`: descartado.**
O schema final usa `Orcamento.leadId @unique` absoluto (mais estrito
que o partial). Lead com orçamento cancelado precisa reativar o
existente, não criar novo — confirmado em `orcamentoService.createOrcamento`.

**Arquivos:**
- `backend/prisma/migrations/0_init/migration.sql` (gerado)
- `backend/prisma/migrations/1_orcamento_lead_ativo_partial_index/migration.sql` (manual)
- `backend/prisma/migrations/migration_lock.toml`
- `backend/package.json`
- Memory `feedback_deploy_schema_order.md` (update)

**Testes:** validação manual em staging — `migrate status` deve mostrar tudo applied. Após deploy em prod, criar uma migration trivial (ex: comentário em campo) e exercer o ciclo completo `dev → commit → deploy`.

**Estimativa:** 2h.

**Risco:** baixo. Migrate deploy só aplica migrations pending; após resolve, não há nenhuma. Se algo der errado, `_prisma_migrations` é só uma tabela de metadata — sem efeito sobre o schema vivo.

---

### Task #4 — Alarme + log em fail-open do Redis blacklist `[LOW]`

**Estado atual:** [`backend/src/config/authMiddleware.js:32-34`](backend/src/config/authMiddleware.js#L32-L34)

```js
} catch {
  // Redis indisponível — aceita o token (fail-open para não derrubar o sistema)
}
```

Trade-off correto (fail-open evita queda total do CRM se Redis cair), mas sem visibilidade. Token revogado pode continuar válido por minutos sem ninguém saber.

**Solução:**

1. Adicionar log explícito + counter em-memória:
   ```js
   let lastRedisFailLogAt = 0;
   try {
     const blacklisted = await isTokenBlacklisted(token);
     if (blacklisted) return res.status(401).json({ message: 'Token revogado' });
   } catch (err) {
     const now = Date.now();
     if (now - lastRedisFailLogAt > 60_000) {
       console.error('[SECURITY] Redis blacklist indisponível — fail-open ativo:', err.message);
       lastRedisFailLogAt = now;
     }
   }
   ```
2. Throttle de 1 log/min evita poluição se Redis estiver morto por horas.
3. Em produção, esses logs vão pra `docker logs` que pode ser scrapeado por algum monitoring (memory `vps_infrastructure.md` não menciona observability stack — fica como TODO de infra, mas o log estará lá).

**Arquivos:**
- `backend/src/config/authMiddleware.js`

**Testes:**
- Atualizar `backend/src/__tests__/authMiddleware.test.js` — adicionar caso onde `isTokenBlacklisted` lança erro: deve passar e logar.

**Estimativa:** 30min.

---

### Task #6 — Content-Security-Policy header `[LOW]`

**Estado atual:** [`front/next.config.mjs`](front/next.config.mjs) tem STS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy. Falta CSP.

**Verificações já feitas:**
- Sem `dangerouslySetInnerHTML` no projeto
- Sem `style={{...}}` inline
- Sem CDN externo (fonts, analytics, scripts)
- Recharts e lucide-react: SVG inline nativo (não viola CSP)
- Socket.IO conecta no `NEXT_PUBLIC_API_URL`

**Solução:** adicionar header em `next.config.mjs`:

```js
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const wsUrl = apiUrl.replace(/^http/, 'ws');

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",  // Tailwind v4 injeta CSS em <style> tags
  `connect-src 'self' ${apiUrl} ${wsUrl}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');
```

E adicionar à lista de headers retornados:
```js
{ key: 'Content-Security-Policy', value: csp },
```

**Notas:**
- `'unsafe-inline'` em `style-src` é necessário pelo Next 16 + React 19 (`<style>` injection do framework) — alternativa seria nonce, mas Next 16 ainda não tem API estável.
- `img-src 'self' data: blob:` cobre placeholder Next + recharts SVG.
- `connect-src` inclui o ws:/wss: derivado do apiUrl pra socket.io.

**Arquivos:**
- `front/next.config.mjs`

**Testes:**
- Manual: rodar `npm run build && npm start` no front, abrir DevTools console, navegar pelas telas críticas (login, dashboard, leads list, lead detail, kanban, orçamento). Zero violações esperadas.
- Em staging: monitorar logs do Traefik + browser console por 24h após deploy.

**Estimativa:** 1.5h (inclui validação manual em todas as telas).

**Rollback:** trivial — remover o header se algo quebrar.

---

### Task #7 — Bump de dependências com vuln moderate `[LOW]`

**Estado atual:** 5 vulns moderate (3 backend, 2 front). Nenhuma em runtime de produção. Fix aplicável via update menor:

- Backend: `prisma` e `@prisma/client` 7.7.0 → 7.8.0
- Front: tailwindcss/postcss/next bump para versão `Wanted` em `npm outdated`

**Solução:**

```bash
# Backend
cd backend
npm install prisma@^7.8.0 @prisma/client@^7.8.0 @prisma/adapter-pg@^7.8.0
npm audit  # esperado: 0 vulns relacionadas a @hono/node-server

# Front
cd front
npm install next@^16.2.4 @tailwindcss/postcss@^4.2.4 tailwindcss@^4.2.4
npm audit  # esperado: postcss issue resolved
```

**Validação:**
- Rodar `npm test` no backend — todos os 429 devem continuar passando.
- Rodar `npm run build` no front — build deve completar sem erro.

**Arquivos:**
- `backend/package.json`, `backend/package-lock.json`
- `front/package.json`, `front/package-lock.json`

**Estimativa:** 1h (inclui regression test).

**Risco:** Prisma 7.7→7.8 é minor — risco de breaking baixo, mas testes vão capturar. Tailwind 4.1→4.2 patch — irrelevante.

---

## 5. Fase P2 — Backlog

### Task #8 — Sweep de acessibilidade `[LOW]`

**Estado atual:** Apenas 15 ocorrências de `aria-`/`role=`/`tabIndex` em 8 arquivos no `components/crm/`. Botões com só ícones lucide são silenciosos para leitores de tela.

**Solução:** sweep manual de todos os componentes interativos:

1. `Button.jsx`, `IconButton`, qualquer componente em `components/ui/` que envolva botão — adicionar prop `ariaLabel` obrigatória quando `children` for só ícone.
2. `Sidebar.jsx`: cada link com ícone precisa de `aria-label`.
3. `DataTable.jsx`: header com `<th scope="col">`, sort buttons com `aria-sort`.
4. Modais (`ModalBase`, `ConfirmDialog`, dialogs em `crm/`): `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando pro título.
5. Forms (`LeadFormFields`, `PremiumSelect`): cada `<input>` com `<label htmlFor>` ou `aria-label`.
6. Status badges com cor: adicionar `<span className="sr-only">` com texto descritivo.
7. Rodar **axe-core** via `@axe-core/react` em dev — capturar violações automaticamente.

**Arquivos:** ~20 arquivos no `front/src/components/`.

**Testes:**
- Adicionar dependência `@axe-core/react` em devDependencies.
- Wirar em `app/layout.jsx` apenas em dev:
  ```js
  if (process.env.NODE_ENV === 'development') {
    import('@axe-core/react').then(axe => axe.default(React, ReactDOM, 1000));
  }
  ```
- Manual: navegação por teclado completa (Tab, Shift+Tab, Enter, Esc) em fluxos críticos.

**Estimativa:** 6–10h (sweep paciente).

**Critério de aceite:** zero violações axe-core em modo strict + nav-by-keyboard end-to-end no fluxo principal.

---

### Task #9 — Smoke E2E com Playwright `[LOW]`

**Estado atual:** 429 testes unitários. Zero E2E. Memory já registra: "Rodar /hm-engineer e /hm-qa após cada feature nova" — E2E fecha o loop.

**Solução:**

1. Adicionar Playwright como devDep no front: `npm install -D @playwright/test`.
2. Criar `front/e2e/` com configuração mínima:
   - `playwright.config.js`: baseURL `http://localhost:3000`, expect timeout 5s, browsers chromium + firefox.
   - Setup: spin up backend de teste (db separado, seed minimal) via `globalSetup`.
3. Escrever 5 specs cobrindo o golden path:
   - `auth.spec.ts`: login → reset senha → logout
   - `lead-create.spec.ts`: criar lead manual → confirmar visível na listagem
   - `lead-transition.spec.ts`: transicionar status (Em prospecção → Aguardando Planta) → ver evento no histórico
   - `orcamento-flow.spec.ts`: criar O.N. via botão na tela do Lead → cancelar com motivo → reativar
   - `rbac.spec.ts`: vendedor não vê leads de outra filial; ADM vê tudo
4. Wirar em CI (quando houver): `playwright test --reporter=html`.

**Arquivos:**
- `front/playwright.config.js` (novo)
- `front/e2e/*.spec.ts` (5 novos)
- `front/package.json`

**Estimativa:** 6–10h.

**Decisão pendente:** rodar em staging real ou mockar o backend? Recomendação: staging real (já que existe `staging.moveisvalcenter.com.br`) — exercita o stack inteiro, incluindo Traefik + cookies httpOnly + cross-origin.

---

## 6. Cronograma sugerido

```
Semana 1 (P0):
  Dia 1: Task #5 (/users lookup)        — 2.5h
  Dia 1: Task #1 (magic-byte)           — 2h
  Dia 2: Task #2 (IDOR /uploads)        — 3h
  Dia 2: smoke test em staging          — 1h
  Dia 3: deploy em prod (memory ordem)  — 1h
                                  total: 9.5h

Semana 2 (P1):
  Dia 1: Task #3 (Prisma migrate baseline)  — 2h
  Dia 2: Task #6 (CSP)                       — 1.5h
  Dia 2: Task #4 (Redis log)                 — 30min
  Dia 3: Task #7 (dep bumps)                 — 1h
  Dia 3: validação + deploy                  — 1h
                                       total: 6h

Sprint seguinte (P2):
  Task #8 (a11y sweep)                  — 8h
  Task #9 (E2E Playwright)              — 8h
                                  total: 16h
```

**Total geral:** ~31.5h ≈ 4 dias de trabalho focado, distribuídos em ~3 semanas.

---

## 7. Riscos & Rollback

| Task | Risco principal | Rollback |
|---|---|---|
| #1 magic-byte | `file-type` rejeita arquivo legítimo edge-case | Feature flag `STRICT_UPLOAD_VALIDATION` em env — desabilita validação avançada |
| #2 IDOR uploads | Frontend quebra exibição de planta antes do deploy do back | Manter rota `/uploads` por 1 sprint (deprecation), só remover após front migrado |
| #3 Prisma migrate | Resolve em prod com URL errada | Backup do `_prisma_migrations` antes; `migrate resolve --rolled-back 0_init` reverte o registro |
| #5 /users scope | Algum select esquecido vira 403 | Gate de `rh:usuarios:read` é additive — basta adicionar a permissão ao role enquanto investiga |
| #6 CSP | Algum recurso bloqueado em prod | Header é trivial de remover — rebuild + redeploy do front em <5min |
| #7 dep bumps | Breaking sutil em Prisma 7.8 | Revert via `git revert` + lockfile commitado |

---

## 8. Critério de "done"

- [ ] Todos os 9 testes/features descritas merged no `develop`
- [ ] `npm test` continua 429+ passando (vai pra ~445 com novos testes)
- [ ] `npm audit` retorna 0 vulns moderate ou maior
- [ ] Deploy validado em staging por 24h sem erros novos no console/log
- [ ] Deploy em prod seguindo memory `feedback_deploy_order.md` (staging primeiro)
- [ ] Memory `feedback_deploy_schema_order.md` atualizada pro novo fluxo `migrate deploy`
- [ ] Memory `vps_infrastructure.md` atualizada com novos endpoints (`/api/crm/leads/:id/planta`, `/users/lookup`) e header CSP

---

**Preparado para execução.** Cada task é independente — podem ser feitas em qualquer ordem dentro da fase, e a fase P0 pode ir hoje.
