# Setup Guide - GRC Flow

## Pré-requisitos

- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- Git ([Download](https://git-scm.com/))
- Conta no GitHub
- Conta no Collify (para deployment)

## Instalação Local

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/grc-flow.git
cd grc-flow
```

### 2. Configure as Variáveis de Ambiente

#### Backend

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grc_flow_dev
DB_USER=postgres
DB_PASSWORD=sua-senha

PORT=3000
NODE_ENV=development

JWT_SECRET=sua-chave-super-secreta-dev
JWT_EXPIRY=7d

OPENAI_API_KEY=sk-xxx

CORS_ORIGIN=http://localhost:5173
```

#### Frontend

```bash
cd ../frontend
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_URL=http://localhost:5173
```

### 3. Setup do Banco de Dados

#### Criar Database

```bash
# Via psql
psql -U postgres -c "CREATE DATABASE grc_flow_dev;"
```

#### Executar Migrations

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed  # Opcional: dados de exemplo
```

### 4. Instalar Dependências

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

### 5. Iniciar a Aplicação

#### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

Deve exibir:
```
Server running on port 3000
Database connected
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Deve exibir:
```
VITE v4.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

Acesse: **http://localhost:5173**

## Deployment em Produção (Collify)

### 1. Preparar Secrets no GitHub

1. Vá para: `Settings → Secrets and variables → Actions`
2. Crie os seguintes secrets:

```
COLLIFY_TOKEN=seu-token-collify
COLLIFY_BACKEND_APP_ID=backend-app-id
COLLIFY_FRONTEND_APP_ID=frontend-app-id
```

### 2. Configurar Database em Produção

```bash
# Conectar à VPS e criar database
ssh usuario@seu-vps.com
psql -U postgres -c "CREATE DATABASE grc_flow;"
psql -U grc_flow < database/setup.sql
```

### 3. Fazer Deploy

```bash
# Push para main dispara o workflow
git push origin main
```

GitHub Actions irá:
1. ✅ Lint e test backend
2. ✅ Lint e test frontend
3. ✅ Build ambos
4. ✅ Deploy via Collify

Monitore em: `GitHub → Actions`

### 4. Verificar Deployment

```bash
curl https://api.seu-dominio.com/health

# Resposta esperada
{
  "status": "ok",
  "database": "connected",
  "uptime": "2h 15m"
}
```

## Docker (Opcional - Desenvolvimento Local)

Se preferir usar Docker:

```bash
docker-compose up
```

Aguarde ~30s para inicializar. Acesse:
- Frontend: http://localhost
- Backend: http://localhost:3000
- Database: localhost:5432

## Troubleshooting

### Erro: "Cannot connect to database"

```bash
# Verifique se PostgreSQL está rodando
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Teste a conexão
psql -h localhost -U postgres -d grc_flow_dev
```

### Erro: "Port 3000 already in use"

```bash
# Altere a porta no .env backend
PORT=3001

# Ou mate o processo anterior
npx kill-port 3000
```

### Erro: "Module not found"

```bash
# Reinstale dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "JWT Secret not defined"

Verifique se `JWT_SECRET` está definido em `.env` backend.

## Scripts Disponíveis

### Backend

```bash
npm run dev        # Iniciar em modo desenvolvimento
npm run build      # Build para produção
npm run start      # Iniciar versão compilada
npm run lint       # ESLint
npm run format     # Prettier
npm run db:migrate # Executar migrations
npm run db:seed    # Popular com dados de exemplo
npm test           # Executar testes
```

### Frontend

```bash
npm run dev        # Iniciar em modo desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
npm run lint       # ESLint
npm run format     # Prettier
npm test           # Executar testes
```

## Estrutura do Projeto

```
grc-flow/
├── backend/              # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/      # Endpoints HTTP
│   │   ├── services/    # Lógica de negócio
│   │   ├── repositories/ # Acesso a dados
│   │   ├── middleware/  # Auth, validation
│   │   ├── config/      # Database, env
│   │   └── index.ts
│   ├── tests/
│   └── package.json
├── frontend/             # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Shared components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   └── App.tsx
│   └── package.json
├── database/             # SQL scripts
│   ├── setup.sql
│   ├── migrations/
│   └── seeds/
└── docs/                 # Documentação
    ├── ARCHITECTURE.md
    ├── API.md
    ├── SETUP.md
    └── ROADMAP.md
```

## Próximos Passos

1. **Autenticação**: Implementar JWT middleware (Phase 2)
2. **Frontend**: Migrar para React (Phase 3)
3. **Features**: Adicionar busca e filtros (Phase 4)
4. **IA**: Integrar OpenAI (Phase 5)

Ver [ROADMAP.md](./ROADMAP.md) para detalhes.
