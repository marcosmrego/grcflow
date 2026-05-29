# Guia Rápido - GRC Flow

## 📋 O que foi criado?

Um sistema profissional de **base de conhecimento e geração de fluxos de processos** com:

✅ **API REST completa** em Node.js + TypeScript
✅ **Banco PostgreSQL** estruturado
✅ **Padrão de camadas** (Routes → Services → Repositories → DB)
✅ **Tipos TypeScript** robustos
✅ **Validação de entrada** com express-validator
✅ **Documentação completa**
✅ **Pronto para evolução com IA**

---

## 🚀 Como começar?

### 1️⃣ Setup do Banco de Dados

**Windows:**
```bash
# Execute como administrador
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

**Manual com PostgreSQL:**
```bash
# 1. Conecte no PostgreSQL
psql -U postgres

# 2. Execute o script
\i database/setup.sql

# 3. Configure o .env
cd backend
cp .env.example .env
# Edite com suas credenciais
```

### 2️⃣ Instalar e Rodar

```bash
cd backend

# Instalar dependências
npm install

# Executar migrações (criar tabelas)
npm run db:migrate

# (Opcional) Popular com dados de exemplo
npm run db:seed

# Iniciar servidor
npm run dev
```

🎉 Servidor rodando em `http://localhost:3000`

---

## 📡 Testando a API

### Opção 1: Postman
1. Abra Postman
2. Import → Escolha `docs/Postman_Collection.json`
3. Teste os endpoints

### Opção 2: cURL

```bash
# Criar item de conhecimento
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Governance",
    "title": "Minha Política",
    "description": "Descrição",
    "content": "Conteúdo completo...",
    "tags": ["governance"]
  }'

# Listar itens
curl http://localhost:3000/api/knowledge

# Buscar
curl "http://localhost:3000/api/knowledge/search?q=governance"

# Criar fluxo
curl -X POST http://localhost:3000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Risk Assessment",
    "description": "Avaliação de riscos trimestral",
    "status": "draft"
  }'
```

### Opção 3: VS Code REST Client
Instale a extensão e crie um arquivo `.rest`:
```
GET http://localhost:3000/health

### Listar conhecimento
GET http://localhost:3000/api/knowledge

### Criar conhecimento
POST http://localhost:3000/api/knowledge
Content-Type: application/json

{
  "category": "Governance",
  "title": "Board Charter",
  "description": "...",
  "content": "...",
  "tags": ["governance"]
}
```

---

## 📁 Estrutura do Projeto

```
GRC Flow/
├── backend/                    # 🔧 API
│   ├── src/
│   │   ├── index.ts           # Entrada da app
│   │   ├── config/            # 🔐 Configuração (DB, env)
│   │   ├── models/            # 📐 Tipos TypeScript
│   │   ├── repositories/      # 💾 Acesso a dados
│   │   ├── services/          # ⚙️  Lógica de negócio
│   │   ├── routes/            # 🛣️  Endpoints
│   │   ├── middleware/        # 🛡️  Middlewares
│   │   └── database/          # 📊 Migrações e Seeds
│   ├── package.json
│   └── tsconfig.json
├── database/
│   └── setup.sql              # 📋 Schema PostgreSQL
├── docs/
│   ├── ARCHITECTURE.md        # 🏗️  Arquitetura técnica
│   └── Postman_Collection.json # 📮 Testes API
├── README.md                  # 📖 Documentação
└── setup.bat / setup.sh       # ⚡ Scripts setup
```

---

## 🎯 Endpoints Principais

### Knowledge Base

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/knowledge` | Listar todos |
| GET | `/api/knowledge/:id` | Obter um item |
| GET | `/api/knowledge/search?q=...` | Buscar |
| GET | `/api/knowledge/category/:cat` | Por categoria |
| GET | `/api/knowledge/tag/:tag` | Por tag |
| POST | `/api/knowledge` | Criar |
| PUT | `/api/knowledge/:id` | Atualizar |
| DELETE | `/api/knowledge/:id` | Deletar |

### Process Flows

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/flows` | Listar fluxos |
| GET | `/api/flows/:id` | Obter fluxo |
| POST | `/api/flows` | Criar fluxo |
| POST | `/api/flows/:id/steps` | Adicionar passo |
| PUT | `/api/flows/:id` | Atualizar fluxo |
| DELETE | `/api/flows/:id` | Deletar fluxo |

---

## 🔄 Próximas Evoluções

### Fase 2: Dashboard Web
```bash
# Frontend React (em outro diretório)
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

### Fase 3: IA (OpenAI)
```typescript
// Será adicionado em AIService
async generateFlowFromKnowledge(knowledgeId: string) {
  // Usar OpenAI para gerar fluxo automaticamente
}
```

### Fase 4: Autenticação
```bash
# JWT + Roles
npm install jsonwebtoken bcryptjs
```

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Watch + hot reload

# Build
npm run build            # Compilar TypeScript
npm run type-check       # Verificar tipos

# Banco de dados
npm run db:migrate       # Executar migrações
npm run db:seed          # Dados de exemplo

# Qualidade
npm run lint             # Eslint
```

---

## 📊 Banco de Dados

### Tabelas principais:

**knowledge_items** - Documentos, políticas, procedimentos
- Busca full-text em português
- Indexado por categoria e tags

**process_flows** - Fluxos de processos
- Status: draft, published, archived
- Versionamento via metadata

**process_steps** - Passos individuais
- Tipos: action, decision, wait, notification
- Encadeamento via nextSteps

---

## 🔒 Variáveis de Ambiente

Edite `backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=grc_user
DB_PASSWORD=sua_senha
DB_NAME=grc_flow

# Server
PORT=3000
NODE_ENV=development

# Future (IA)
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret
```

---

## ❓ Troubleshooting

**Erro: Connection refused**
- PostgreSQL não está rodando
- Verificar credenciais em `.env`

**Erro: Module not found**
- Executar `npm install`

**Erro: Type errors**
- Executar `npm run type-check`

---

## 📚 Recursos Úteis

- [README.md](../README.md) - Documentação completa
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detalhes técnicos
- [Postman Collection](./Postman_Collection.json) - Testar API

---

## 💬 Próximos Passos Recomendados

1. ✅ Executar `setup.bat` (Windows) ou `setup.sh` (Linux/Mac)
2. ✅ Criar arquivo `.env` com suas credenciais
3. ✅ Rodar `npm run db:migrate` para criar tabelas
4. ✅ Iniciar servidor com `npm run dev`
5. ✅ Testar endpoints com Postman
6. 📋 Começar a adicionar conhecimento na base
7. 📊 Criar primeiros fluxos de processos
8. 🤖 Preparar para integração com IA

---

**Dúvidas?** Consulte a documentação técnica ou execute os scripts de setup!
