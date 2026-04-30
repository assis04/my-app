# E2E Tests — Playwright

Smoke tests que exercitam o stack inteiro. Por default rodam contra **staging**
porque ele tem dados reais e exercita Traefik + cookies httpOnly + CORS.

## Setup (uma vez)

```bash
cd front
npm run e2e:install   # baixa browsers chromium + firefox
```

## Rodar

Variáveis obrigatórias (definir no shell, **nunca commitar**):

```bash
export E2E_USER_EMAIL=qa-vendedor@empresa.com
export E2E_USER_PASSWORD=...
# Opcionais — pra testar fluxos ADM:
export E2E_ADMIN_EMAIL=qa-admin@empresa.com
export E2E_ADMIN_PASSWORD=...
# Opcional — override do alvo (default: staging):
export E2E_BASE_URL=http://localhost:3000
export E2E_API_URL=http://localhost:3001
```

Comandos:

```bash
npm run e2e          # rodada full, modo headless
npm run e2e:ui       # modo UI interativo (debug)
```

## Specs

| Spec | O que testa |
|---|---|
| `auth.spec.js` | login com creds inválidas/válidas, redirect de rota protegida |
| `lead-create.spec.js` | criar lead manual e ver na listagem |
| `lead-transition.spec.js` | mudar status do lead, ver evento no histórico |
| `orcamento-flow.spec.js` | criar O.N. → cancelar com motivo → reativar |
| `rbac.spec.js` | vendedor não vê /rh/gerenciar-usuarios; ADM vê; /users 403 vs /users/lookup 200 |

## Notas

- Specs criam dados (lead novo) — em staging tudo bem; em prod, **não rodar** sem
  filtrar/limpar depois.
- Login é via UI por default (exercita o fluxo real). Pra CI rápido, considerar
  storage state cacheado em `globalSetup`.
- Em CI: `forbidOnly: true`, `retries: 2`, `workers: 1` (definidos em
  `playwright.config.js`).
