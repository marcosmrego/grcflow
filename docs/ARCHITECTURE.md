# Guia de Arquitetura Técnica - GRC Flow

## Visão Geral da Arquitetura

### Padrões e Princípios

#### 1. **Camadas da Aplicação**

```
┌─────────────────────────────────────────┐
│         Express Routes (routes/)         │ API Layer
├─────────────────────────────────────────┤
│         Services (services/)             │ Business Logic
├─────────────────────────────────────────┤
│      Repositories (repositories/)        │ Data Access
├─────────────────────────────────────────┤
│       Database (Config/Database)         │ Persistence
└─────────────────────────────────────────┘
```

#### 2. **Repository Pattern**
- Encapsula lógica de acesso a dados
- Facilita testes unitários
- Permite trocar implementação de banco facilmente

#### 3. **Service Layer**
- Contém lógica de negócio
- Utiliza repositórios para dados
- Independente do HTTP

#### 4. **Type Safety**
- Tipos TypeScript fortes
- Interfaces bem definidas
- Validação com express-validator

## Fluxo de Dados

### Criação de Knowledge Item

```
1. POST /api/knowledge
   ↓
2. Route Handler (knowledge.ts)
   - Valida entrada
   - Chama knowledgeService.createItem()
   ↓
3. KnowledgeService
   - Lógica de negócio
   - Chama knowledgeRepository.create()
   ↓
4. KnowledgeRepository
   - Executa query SQL
   - Mapeia resultado para tipo
   ↓
5. Database
   - Insere em knowledge_items
   ↓
6. Resposta JSON
   - 201 Created + dados do item
```

## Banco de Dados

### Modelo Relacional

#### knowledge_items
- Armazena documentos, políticas, procedimentos
- Indexado por categoria, tags, data
- Busca full-text em português

#### process_flows
- Define fluxos de processos
- Status: draft, published, archived
- Metadados em JSONB

#### process_steps
- Passos individuais de um fluxo
- Tipos: action, decision, wait, notification
- Inputs/outputs como JSONB

#### categories
- Hierarquia de categorias
- Self-referential com parent_id

#### tags
- Tags reutilizáveis
- Cor para visualização

## Estratégia de Evolução para IA

### Fase 1: Preparação (Atual)
- ✅ Base de dados estruturada
- ✅ API RESTful completa
- ✅ Tipos TypeScript bem definidos
- ✅ Repositórios e Services isolados

### Fase 2: Integração com IA
```typescript
// Novo serviço: AIService
class AIService {
  async generateFlowFromKnowledge(knowledgeId: string): Promise<ProcessFlow> {
    // 1. Buscar knowledge item
    // 2. Usar OpenAI para gerar fluxo
    // 3. Salvar fluxo gerado
  }

  async enhanceFlowDescription(flowId: string): Promise<void> {
    // Melhorar descrição usando IA
  }

  async suggestOptimizations(flowId: string): Promise<Suggestion[]> {
    // Sugerir otimizações de fluxo
  }
}
```

### Fase 3: Evolução Contínua
- Aprendizado de fluxos existentes
- Recomendações personalizadas
- Análise de conformidade automática

## Performance e Escalabilidade

### Índices Principais
- `idx_knowledge_category` - Busca por categoria
- `idx_knowledge_text` - Busca full-text
- `idx_knowledge_tags` - Busca por tags
- `idx_flows_status` - Filtro por status
- `idx_steps_flow_id` - Carregamento de fluxos

### Otimizações Futuras
- Cache Redis para conhecimento frequente
- Paginação eficiente
- Compressão de dados históricos
- Sharding por categoria

## Segurança

### Implementado
- ✅ Validação de entrada (express-validator)
- ✅ Helmet.js (headers de segurança)
- ✅ CORS configurável
- ✅ Types seguros (TypeScript)

### Planejado
- [ ] JWT Authentication
- [ ] Rate limiting
- [ ] Auditoria de mudanças
- [ ] Encriptação de dados sensíveis
- [ ] RBAC (Role-Based Access Control)

## Testabilidade

### Padrões para Testes
```typescript
// Services são testáveis
const service = new KnowledgeService();
const item = await service.createItem({...});

// Mocks de repositórios
jest.mock('../repositories/KnowledgeRepository');

// Testes de rota
app.post('/api/knowledge', routeHandler);
// request(app).post('/api/knowledge').send({...})
```

## Deployment

### Docker (Futuro)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Variáveis de Ambiente
```env
NODE_ENV=production
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_USER=grc_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=grc_flow
OPENAI_API_KEY=${OPENAI_API_KEY}
JWT_SECRET=${JWT_SECRET}
```

## Contribuição e Padrões

### Criação de Novo Endpoint

1. **Define tipo** em `models/types.ts`
2. **Cria repositório** em `repositories/`
3. **Cria serviço** em `services/`
4. **Cria rotas** em `routes/`
5. **Valida entrada** com express-validator

Exemplo:
```typescript
// 1. Type
export interface NewEntity { ... }

// 2. Repository
export class NewRepository {
  async create(item: NewEntity) { ... }
}

// 3. Service
export class NewService {
  async create(item: NewEntity) {
    return repository.create(item);
  }
}

// 4. Route
router.post('/', body('...').validate(), async (req, res) => {
  const result = await service.create(req.body);
  res.status(201).json(result);
});
```

## Links Úteis

- [Express.js Docs](https://expressjs.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [OpenAI API](https://platform.openai.com/docs)
