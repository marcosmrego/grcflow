# Como Executar o GRC Flow

Guia passo a passo para rodar o projeto completo.

## 📋 Pré-requisitos

- **Node.js** 16+ ([download](https://nodejs.org))
- **PostgreSQL** 12+ ([download](https://www.postgresql.org/download))
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)

## 🚀 Setup Rápido (5 minutos)

### 1. Backend - Database

```bash
# Windows - Execute como administrador
setup.bat

# Linux/Mac
chmod +x setup.sh
./setup.sh
```

Ou **manualmente**:

```bash
# Conectar no PostgreSQL
psql -U postgres

# Executar setup
\i database/setup.sql

# Verificar
\l  # deve aparecer grc_flow
\q  # sair
```

### 2. Backend - Instalação

```bash
cd backend

# Copiar arquivo de configuração
cp .env.example .env

# Editar .env com suas credenciais PostgreSQL
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=grc_user
# DB_PASSWORD=sua_senha
# DB_NAME=grc_flow

# Instalar dependências
npm install

# Executar migrações (criar tabelas)
npm run db:migrate

# (Opcional) Popular com dados de exemplo
npm run db:seed

# Iniciar servidor
npm run dev
```

✅ Backend rodando em `http://localhost:3000`

### 3. Frontend - Executar

**Opção A: Python HTTP Server**
```bash
cd frontend
python -m http.server 8000
```

**Opção B: Node.js HTTP Server**
```bash
cd frontend
npx http-server
```

**Opção C: Abrir diretamente no navegador**
```bash
# Windows
start frontend/index.html

# Linux
xdg-open frontend/index.html

# Mac
open frontend/index.html
```

✅ Frontend rodando em `http://localhost:8000`

## 🧪 Testar a Aplicação

### 1. Dashboard
Acesse: `http://localhost:8000`

Você deverá ver:
- Estatísticas (0 conhecimentos, 0 fluxos)
- Status da API (Verde)
- Botões para criar novos itens

### 2. Criar Conhecimento

```bash
# Via API (curl)
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Governance",
    "title": "Test Item",
    "description": "Description",
    "content": "Content here",
    "tags": ["test"]
  }'

# Ou via Interface
# 1. Clique em "+ Novo Conhecimento"
# 2. Preencha os campos
# 3. Clique em "Salvar"
# 4. Atualize o dashboard
```

### 3. Criar Fluxo de Processo

```bash
# Via Interface
# 1. Acesse "Fluxos de Processos"
# 2. Clique em "+ Novo Fluxo"
# 3. Preencha nome e descrição
# 4. Clique em "Salvar"
```

### 4. Verificar Status

```bash
# Health check
curl http://localhost:3000/health

# Listar conhecimento
curl http://localhost:3000/api/knowledge

# Listar fluxos
curl http://localhost:3000/api/flows
```

## 🐛 Troubleshooting

### Backend não conecta ao banco

```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -d postgres -c "SELECT 1"

# Se erro, verificar credenciais em .env
cat backend/.env

# Testar conexão diretamente
psql -h localhost -U grc_user -d grc_flow
```

### Frontend mostra "API Offline"

```bash
# Verificar se backend está rodando
curl http://localhost:3000/health

# Se não responder, iniciar backend
cd backend
npm run dev
```

### Porta 3000 ou 8000 em uso

```bash
# Mudar porta do backend (.env)
PORT=3001

# Mudar porta do servidor HTTP
python -m http.server 8001
```

### Erro de CORS

Backend já está configurado com CORS. Se persistir:

```bash
# Verificar headers
curl -i http://localhost:3000/api/knowledge
# Deve haver: Access-Control-Allow-Origin: *
```

## 📊 Estrutura de Diretórios

```
GRC Flow/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Servidor principal
│   │   ├── config/           # Configuração
│   │   ├── models/           # Tipos TypeScript
│   │   ├── repositories/     # Dados
│   │   ├── services/         # Lógica
│   │   ├── routes/           # Endpoints
│   │   └── database/         # Migrações
│   ├── dist/                 # Build compilado
│   ├── package.json
│   └── .env                  # Configuração (local)
│
├── frontend/
│   ├── index.html            # Dashboard
│   ├── pages/
│   │   ├── knowledge.html
│   │   └── flows.html
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── flows.css
│   └── js/
│       ├── api.js            # Cliente HTTP
│       ├── dashboard.js
│       ├── knowledge.js
│       └── flows.js
│
├── database/
│   └── setup.sql             # Schema PostgreSQL
│
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── EXAMPLES.md
│   └── Postman_Collection.json
│
└── README.md
```

## 📝 Workflow Típico

### Primeira Vez

1. Clone/baixe o projeto
2. Execute `setup.bat` (Windows) ou `setup.sh`
3. Configure PostgreSQL
4. Rode `npm install` no backend
5. Rode `npm run db:migrate`
6. Inicie backend: `npm run dev`
7. Inicie frontend: `python -m http.server 8000`
8. Abra navegador em `http://localhost:8000`

### Desenvolvimento Diário

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
python -m http.server 8000

# Terminal 3 - (Opcional) Executar SQL
psql -U grc_user -d grc_flow
```

## 🔄 Reabrir o Projeto

Se fechou todos os terminais e quer reabrir:

```bash
# Backend (se a base está OK)
cd backend
npm run dev

# Frontend
cd frontend
python -m http.server 8000

# Se precisar resetar o banco
npm run db:migrate  # Recria tabelas
npm run db:seed     # Popula dados de teste
```

## 📱 Testar em Celular/Tablet

```bash
# Descobrir IP da máquina
ipconfig getifaddr en0  # Mac
hostname -I              # Linux
ipconfig                 # Windows (procurar IPv4)

# Frontend
http://SEU_IP:8000

# Backend (se necessário)
http://SEU_IP:3000
```

## 🚢 Próximos Passos

### Desenvolvimento
- [ ] Adicionar itens de conhecimento
- [ ] Criar fluxos de processos
- [ ] Testar busca e filtros
- [ ] Validar integrações

### Produção
- [ ] Configurar domínio
- [ ] Setup SSL/HTTPS
- [ ] Deploy backend (Heroku, AWS)
- [ ] Deploy frontend (Vercel, Netlify, AWS S3)
- [ ] Configurar CI/CD
- [ ] Configurar backups do banco

## 📞 Suporte

Consulte os arquivos de documentação:
- [README.md](./README.md) - Visão geral
- [QUICKSTART.md](./QUICKSTART.md) - Guia rápido
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Arquitetura técnica
- [docs/EXAMPLES.md](./docs/EXAMPLES.md) - Exemplos práticos

---

**Status**: Pronto para uso! 🚀
