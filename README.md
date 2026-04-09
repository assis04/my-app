# Ambisistem CRM - Modern Management Solution

![Ambisistem CRM Banner](https://img.shields.io/badge/Design-Premium_Slim-blue?style=for-the-badge&logo=tailwind-css)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Backend-Node.js_Express-green?style=for-the-badge&logo=node.js)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma)

Uma solução completa e de alto desempenho para gestão de CRM, RH e Captação de Leads, desenvolvida com foco em **densidade de dados máxima** e **estética premium**.

---

## 🚀 Principais Módulos

### 📊 Dashboard Inteligente
Painel de controle com KPIs em tempo real, gráficos de faturamento, leads e conversão. Otimizado com o **Ultra Slim Pass** para visualização global sem rolagem.

### 👥 Gestão de RH (Recursos Humanos)
Controle total de Colaboradores, Equipes, Filiais e Perfis de Acesso. 
- Gerenciamento de permissões granular.
- Listagens de alta densidade para gestão eficiente.

### 💼 CRM & Orçamentos
Gestão centralizada de solicitações de orçamento.
- Filtros inteligentes e dinâmicos.
- Visualização compacta de leads ativos.
- Detalhamento de interações e histórico.

### ⚡ Captação & Fila da Vez
Sistema de distribuição automática e manual de leads entre vendedores.
- **Fila Digital Real-time:** Atualização instantânea via WebSockets.
- **Histórico de Atendimento:** Auditoria completa e filtros por período/vendedor.

---

## 🎨 Design System: **Premium Slim**

O projeto utiliza uma identidade visual exclusiva focada em performance e sofisticação:
- **Ultra Slim Pass:** Redução sistemática de espaços (paddings/margins) para exibir +60% de dados por tela.
- **Micro-interações:** Feedback visual suave em todos os botões e transições de página.
- **Visual Crystal:** Uso de `glass-card` com `backdrop-blur` e fundos brancos puros.

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** Next.js 15+ (App Router)
- **Biblioteca UI:** React 19
- **Estilização:** Tailwind CSS 4
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Comunicação:** Socket.io-client (Real-time)

### Backend
- **Ambiente:** Node.js + Express 5
- **Banco de Dados:** PostgreSQL (via Prisma ORM)
- **Autenticação:** JWT (JSON Web Tokens) & Cookies
- **Segurança:** Helmet, Rate Limit, Zod (Validação)
- **Uploads:** Multer (Armazenamento de plantas/documentos)

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js (v18+)
- PostgreSQL ativo

### Passo 1: Backend
1. Entre na pasta `backend`: `cd backend`
2. Instale as dependências: `npm install`
3. Configure o `.env` (DATABASE_URL, JWT_SECRET)
4. Rode as migrações do banco: `npx prisma migrate dev`
5. Inicie o servidor: `npm start`

### Passo 2: Frontend
1. Entre na pasta `front`: `cd front`
2. Instale as dependências: `npm install`
3. Inicie o ambiente de desenvolvimento: `npm run dev`

---

Desenvolvido por **Thiago**
