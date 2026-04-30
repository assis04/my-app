# Migrations Prisma — Baseline e Procedimento

Este projeto migrou de `prisma db push` para `prisma migrate` em
2026-04-30. A migration `0_init/migration.sql` é a **baseline** —
reflete o schema vivo em produção naquele momento.

## Como aplicar a baseline em ambientes existentes (staging, prod)

Em **cada ambiente** (staging primeiro, depois produção), rode UMA vez:

```bash
DATABASE_URL=<url-do-ambiente> npx prisma migrate resolve --applied 0_init
```

Esse comando **não executa SQL** — só insere uma linha em
`_prisma_migrations` registrando que `0_init` já está aplicada (o que
é verdade, porque o schema vivo nasceu de `db push` repetidos).

Após esse passo, o ambiente está pronto pra receber novas migrations
via `prisma migrate deploy`.

## Fluxo daqui pra frente

### Em desenvolvimento

Quando alterar `schema.prisma`:

```bash
npm run db:migrate:dev -- --name <descricao_curta>
```

Isso:
1. Gera `prisma/migrations/<timestamp>_<nome>/migration.sql`
2. Aplica no banco local de dev
3. Regenera o Prisma Client

Commitar a pasta da migration junto com a mudança de schema.

### Em staging / produção (deploy)

Substitui `npx prisma db push` por:

```bash
npx prisma migrate deploy
```

Esse comando aplica todas as migrations pending na ordem. Não interativo,
seguro pra rodar em CI/CD. Executar **antes** de subir o backend novo
(diferente do `db push` antigo, que precisava do container já rodando).

### Status

```bash
npm run db:migrate:status
```

Lista o que já foi aplicado vs pending.

## Notas

- **Não use mais `prisma db push`** em ambientes que não sejam dev local
  experimental. Push não cria histórico, não permite rollback e diverge
  do que está em git.
- **Não rode `migrate dev` em produção** — só `migrate deploy`.
- O partial unique index `orcamento_lead_ativo` discutido em
  `specs/crm-non-plan.md` §2.2 **não é necessário**: o schema final
  usa `Orcamento.leadId @unique` absoluto (mais estrito que o partial),
  enforce vivo já garante 1:1 Lead↔Orcamento.
