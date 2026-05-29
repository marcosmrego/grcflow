# GRC Flow - Governance, Risk & Compliance Platform

Sistema inteligente de base de conhecimento e geração de fluxos de processos para Governança, Riscos e Compliance (GRC).

**Desenvolvido em parceria com Expansão AI** 🤝

---

## 📋 O que é GRC Flow?

O **GRC Flow** é uma plataforma modular e escalável que capacita organizações a:

1. **📚 Base de Conhecimento (KB)** - Armazenar, organizar, buscar e versionar documentos, políticas, procedimentos
2. **⚙️ Gestão de Processos** - Criar, visualizar, executar e otimizar fluxos de processos
3. **🤖 Automação com IA** - Sugestões automáticas, categorização inteligente, análise de compliance
4. **🔐 Governança & Compliance** - Aprovações, audit logs, controle de acesso, versionamento

---

## 🚀 Quick Start (3 minutos)

### Opção 1: Docker (Recomendado)

```bash
# Clone e navegue
git clone https://github.com/seu-usuario/grc-flow.git
cd grc-flow

# Inicie com Docker
docker-compose up

# Acesse
# Frontend: http://localhost
# Backend API: http://localhost:3000
# pgAdmin: http://localhost:5050
```

### Opção 2: Manual

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev

# (Em outro terminal) Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

# Acesse http://localhost:5173
```

**Documentação Completa**: Ver [SETUP.md](./docs/SETUP.md)

---

## 🏗️ Estrutura do Projeto

```
grc-flow/
├── .github/
│   └── workflows/        # CI/CD (GitHub Actions)
├── backend/              # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/       # Database, environment
│   │   ├── middleware/   # Auth, validation, logging
│   │   ├── models/       # TypeScript interfaces
│   │   ├── repositories/ # Data access layer
│   │   ├── routes/       # HTTP endpoints
│   │   ├── services/     # Business logic
│   │   └── index.ts
│   └── package.json
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities & API client
│   │   ├── pages/        # Page components
│   │   ├── stores/       # State management (Zustand)
│   │   └── App.tsx
│   └── package.json
├── database/             # SQL migrations & seeds
├── docs/                 # Documentação
│   ├── ARCHITECTURE.md   # Arquitetura detalhada
│   ├── API.md            # Referência de API
│   ├── SETUP.md          # Setup & deployment
│   └── ROADMAP.md        # Roadmap de features
├── docker-compose.yml    # Desenvolvimento com Docker
└── README.md
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitetura técnica, padrões de design, modelos de dados |
| [API.md](./docs/API.md) | Referência completa de endpoints, autenticação, errors |
| [SETUP.md](./docs/SETUP.md) | Guia de instalação, configuração, troubleshooting |
| [ROADMAP.md](./docs/ROADMAP.md) | Fases de desenvolvimento, timeline, objetivos |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 12+
- **Auth**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **AI**: OpenAI API

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui
- **State**: Zustand
- **HTTP**: Axios

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Collify
- **Database**: PostgreSQL 12+

---

## 📅 Roadmap

### ✅ FASE 1: Setup & Infraestrutura (Maio 2026)
- Estrutura de repositório
- Documentação
- CI/CD pipeline
- Docker setup

### 🔄 FASE 2: Segurança & Backend (Junho 2026)
- JWT Authentication
- RBAC (Roles & Permissions)
- Audit Log & Soft Delete
- Testes unitários

### ⏳ FASE 3: Frontend Moderno (Junho-Julho 2026)
- React + TypeScript completo
- Design system
- State management
- Testes de UI

### ⏳ FASE 4: Features Core (Julho 2026)
- Busca full-text + Filtros
- Versionamento de documentos
- Workflows de aprovação
- Exportação (PDF, JSON, CSV)

### ⏳ FASE 5: IA & Automação (Agosto 2026)
- Categorização automática
- Resumos com OpenAI
- Busca semântica
- Análise de compliance

**Timeline Completo**: Ver [ROADMAP.md](./docs/ROADMAP.md)

---

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ RBAC com roles granulares
- ✅ Proteção contra SQL injection
- ✅ Rate limiting
- ✅ CORS configurável
- ✅ Audit log completo
- ✅ Soft delete com versionamento
- ✅ Helmet security headers

---

## 📦 Instalação Rápida

### Pré-requisitos

- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose (opcional)

### Setup Local

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/grc-flow.git
cd grc-flow
```

2. **Backend**
```bash
cd backend
cp .env.example .env  # Edite com suas configs
npm install
npm run db:migrate    # Setup banco de dados
npm run dev          # Iniciar em modo desenvolvimento
```

3. **Frontend**
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev          # Iniciar Vite dev server
```

4. **Acesse**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Documentação: ./docs/

---

## 🧪 Testing

```bash
# Backend
cd backend
npm test              # Jest unit tests
npm run lint          # ESLint

# Frontend
cd frontend
npm test              # Vitest + React Testing Library
npm run lint          # ESLint
```

---

## 🚀 Deploy em Produção

### Com Collify

1. Configurar secrets no GitHub (COLLIFY_TOKEN, APP_IDs)
2. Push para branch `main` dispara automático
3. GitHub Actions rodará CI/CD
4. Collify fará deploy

Ver [SETUP.md - Deployment](./docs/SETUP.md#deployment-em-produção-collify)

---

## 🤝 Contribuindo

1. Faça um fork
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📞 Suporte

- **Issues**: GitHub Issues
- **Documentação**: Ver `./docs/`
- **Email**: contato@expansaoai.com

---

## 📄 Licença

Este projeto é desenvolvido em parceria com Expansão AI.

---

## 👥 Equipe

- **Parceria**: Expansão AI + Thiago
- **Infraestrutura**: VPS pessoal + Collify

---

**Última atualização**: 29 de Maio de 2026
**Status**: 🚀 Em desenvolvimento ativo

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais de banco de dados:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=grc_flow
PORT=3000
```

4. **Execute as migrações**

```bash
npm run db:migrate
```

5. **Popule o banco com dados de exemplo (opcional)**

```bash
npm run db:seed
```

6. **Inicie o servidor**

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## 📡 API Endpoints

### Knowledge Base

#### Listar todos os itens
```http
GET /api/knowledge?limit=50&offset=0
```

#### Buscar por categoria
```http
GET /api/knowledge/category/{category}?limit=20&offset=0
```

#### Buscar por tag
```http
GET /api/knowledge/tag/{tag}
```

#### Buscar com query
```http
GET /api/knowledge/search?q=governance
```

#### Obter item específico
```http
GET /api/knowledge/{id}
```

#### Criar novo item
```http
POST /api/knowledge
Content-Type: application/json

{
  "category": "Governance",
  "title": "Board Charter",
  "description": "Board governance charter",
  "content": "Full content here...",
  "tags": ["governance", "approved"]
}
```

#### Atualizar item
```http
PUT /api/knowledge/{id}
Content-Type: application/json

{
  "title": "Updated Board Charter",
  "content": "Updated content..."
}
```

#### Deletar item
```http
DELETE /api/knowledge/{id}
```

### Process Flows

#### Listar fluxos
```http
GET /api/flows?status=draft
```

Valores possíveis de status: `draft`, `published`, `archived`

#### Obter fluxo específico
```http
GET /api/flows/{id}
```

#### Criar novo fluxo
```http
POST /api/flows
Content-Type: application/json

{
  "name": "Risk Assessment Process",
  "description": "Process for quarterly risk assessments",
  "status": "draft",
  "metadata": {
    "department": "Risk Management"
  }
}
```

#### Adicionar passo ao fluxo
```http
POST /api/flows/{flowId}/steps
Content-Type: application/json

{
  "order": 1,
  "title": "Identify Risks",
  "description": "Identify potential risks",
  "type": "action",
  "inputs": { "department": "string" },
  "outputs": { "risks": "array" },
  "nextSteps": ["step-id-2"]
}
```

Tipos de passos: `action`, `decision`, `wait`, `notification`

#### Atualizar fluxo
```http
PUT /api/flows/{id}
Content-Type: application/json

{
  "status": "published",
  "metadata": { "version": "1.0" }
}
```

#### Deletar fluxo
```http
DELETE /api/flows/{id}
```

## 🗄️ Schema do Banco de Dados

### knowledge_items
```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  category VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  content TEXT,
  tags JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### process_flows
```sql
CREATE TABLE process_flows (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  metadata JSONB,
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### process_steps
```sql
CREATE TABLE process_steps (
  id UUID PRIMARY KEY,
  flow_id UUID,
  order INTEGER,
  title VARCHAR(255),
  description TEXT,
  type VARCHAR(50),
  inputs JSONB,
  outputs JSONB,
  next_steps JSONB,
  created_at TIMESTAMP
);
```

## 🔄 Fluxo de Desenvolvimento Futuro

### Fase 1: Base de Conhecimento (Atual) ✅
- [x] CRUD de itens de conhecimento
- [x] Organização por categorias
- [x] Busca por tags
- [x] Busca de texto completo
- [ ] Versionamento de documentos
- [ ] Sistema de aprovação

### Fase 2: Fluxos de Processos
- [x] CRUD básico de fluxos
- [x] Adicionar passos aos fluxos
- [ ] Validação de fluxos
- [ ] Visualização gráfica
- [ ] Execução de fluxos
- [ ] Histórico de execução

### Fase 3: Geração com IA
- [ ] Integração com OpenAI
- [ ] Gerar fluxos a partir de conhecimento
- [ ] Sugestão de melhorias
- [ ] Análise de conformidade

### Fase 4: Interface Web
- [ ] Dashboard
- [ ] Editor visual de fluxos
- [ ] Sistema de usuários
- [ ] Auditoria e logs
- [ ] Relatórios

## 🛠️ Scripts Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor em modo watch

# Build
npm run build           # Compila TypeScript
npm run type-check      # Verifica tipos sem emitir código

# Banco de dados
npm run db:migrate      # Executa migrações
npm run db:seed         # Popula com dados de exemplo

# Linting
npm run lint            # Executa eslint
```

## 📝 Estrutura de Tipos

### KnowledgeItem
```typescript
interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### ProcessFlow
```typescript
interface ProcessFlow {
  id: string;
  name: string;
  description: string;
  steps: ProcessStep[];
  metadata: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

### ProcessStep
```typescript
interface ProcessStep {
  id: string;
  flowId: string;
  order: number;
  title: string;
  description: string;
  type: 'action' | 'decision' | 'wait' | 'notification';
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  nextSteps?: string[];
}
```

## 📚 Exemplos de Uso

### Criar base de conhecimento sobre Governance
```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Governance",
    "title": "Board Governance Framework",
    "description": "Framework for board governance",
    "content": "The board is responsible for oversight...",
    "tags": ["governance", "approved"]
  }'
```

### Criar fluxo de Risk Assessment
```bash
curl -X POST http://localhost:3000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Risk Assessment",
    "description": "Quarterly risk assessment process",
    "status": "draft"
  }'
```

## 🔐 Segurança

- [ ] Autenticação JWT
- [ ] Autorização por roles
- [ ] Rate limiting
- [ ] Validação de entrada
- [ ] CORS configurável
- [ ] Helmet.js para headers de segurança

## 📞 Suporte

Para dúvidas ou sugestões sobre o projeto, consulte a documentação ou entre em contato com a equipe.

## 📄 Licença

ISC
