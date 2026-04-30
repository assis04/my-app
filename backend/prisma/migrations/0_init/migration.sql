-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" INTEGER,
    "filial_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "equipe_id" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filiais" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "manager_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "lider_id" INTEGER,
    "filial_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_sales_queues" (
    "branch_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "last_assigned_at" TIMESTAMP(3),
    "attend_count_30d" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "branch_sales_queues_pkey" PRIMARY KEY ("branch_id","user_id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT,
    "celular" TEXT NOT NULL,
    "email" TEXT,
    "cpf_cnpj" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Em prospecção',
    "etapa" TEXT,
    "temperatura" TEXT,
    "status_antes_cancelamento" TEXT,
    "tipo_imovel" TEXT,
    "status_imovel" TEXT,
    "planta_path" TEXT,
    "pedidos_contratos" TEXT,
    "canal" TEXT,
    "origem" TEXT,
    "parceria" TEXT,
    "origem_canal" TEXT,
    "origem_externa" BOOLEAN NOT NULL DEFAULT false,
    "conjuge_nome" TEXT,
    "conjuge_sobrenome" TEXT,
    "conjuge_celular" TEXT,
    "conjuge_email" TEXT,
    "vendedor_id" INTEGER,
    "pre_vendedor_id" INTEGER,
    "gerente_id" INTEGER,
    "filial_id" INTEGER,
    "conta_id" INTEGER,
    "fonte" TEXT DEFAULT 'crm',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),
    "reativado_em" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_cards" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "coluna" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Nova O.N.',
    "motivo_cancelamento" TEXT,
    "cancelado_em" TIMESTAMP(3),
    "reativado_em" TIMESTAMP(3),
    "criado_por_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" SERIAL NOT NULL,
    "aggregate" TEXT NOT NULL,
    "aggregate_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_history" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "author_user_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataVencimento" TIMESTAMP(3),
    "created_by_id" INTEGER NOT NULL,
    "assigned_to_user_id" INTEGER,
    "assigned_to_equipe_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nome_key" ON "roles"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "filiais_nome_key" ON "filiais"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "equipes_nome_key" ON "equipes"("nome");

-- CreateIndex
CREATE INDEX "leads_vendedor_id_idx" ON "leads"("vendedor_id");

-- CreateIndex
CREATE INDEX "leads_pre_vendedor_id_idx" ON "leads"("pre_vendedor_id");

-- CreateIndex
CREATE INDEX "leads_gerente_id_idx" ON "leads"("gerente_id");

-- CreateIndex
CREATE INDEX "leads_filial_id_idx" ON "leads"("filial_id");

-- CreateIndex
CREATE INDEX "leads_conta_id_idx" ON "leads"("conta_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_temperatura_idx" ON "leads"("temperatura");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_celular_nome_cep_key" ON "accounts"("celular", "nome", "cep");

-- CreateIndex
CREATE UNIQUE INDEX "kanban_cards_lead_id_key" ON "kanban_cards"("lead_id");

-- CreateIndex
CREATE INDEX "kanban_cards_coluna_posicao_idx" ON "kanban_cards"("coluna", "posicao");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_numero_key" ON "orcamentos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_lead_id_key" ON "orcamentos"("lead_id");

-- CreateIndex
CREATE INDEX "orcamentos_status_idx" ON "orcamentos"("status");

-- CreateIndex
CREATE INDEX "orcamentos_created_at_idx" ON "orcamentos"("created_at");

-- CreateIndex
CREATE INDEX "outbox_status_created_at_idx" ON "outbox"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_aggregate_aggregate_id_idx" ON "outbox"("aggregate", "aggregate_id");

-- CreateIndex
CREATE INDEX "lead_history_lead_id_created_at_idx" ON "lead_history"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "lead_history_event_type_idx" ON "lead_history"("event_type");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_user_id_idx" ON "tasks"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "tasks_created_by_id_idx" ON "tasks"("created_by_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_equipe_id_idx" ON "tasks"("assigned_to_equipe_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filiais" ADD CONSTRAINT "filiais_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_sales_queues" ADD CONSTRAINT "branch_sales_queues_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_sales_queues" ADD CONSTRAINT "branch_sales_queues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pre_vendedor_id_fkey" FOREIGN KEY ("pre_vendedor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_user_id_fkey" FOREIGN KEY ("criado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_history" ADD CONSTRAINT "lead_history_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_equipe_id_fkey" FOREIGN KEY ("assigned_to_equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

