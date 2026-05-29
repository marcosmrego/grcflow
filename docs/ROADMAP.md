# Roadmap - GRC Flow

## Overview

O GRC Flow é desenvolvido em fases, com objetivos claros de entregas e evolução da plataforma.

---

## 📅 FASE 1: SETUP & INFRAESTRUTURA
**Status**: 🔄 Em Andamento  
**Timeline**: Maio 2026 (1-2 dias)  
**Responsável**: DevOps

### Objetivos
- [ ] ✅ Estrutura de repositório Git monorepo
- [ ] ✅ Documentação arquitetura, API, setup
- [ ] ✅ GitHub Actions workflow (CI/CD)
- [ ] ✅ .env.example configurado
- [ ] Deploy pipeline Collify setup
- [ ] Notion workspace com roadmap

### Deliverables
- Repositório público no GitHub
- Documentação completa
- CI/CD funcionando
- Ambiente preparado para dev

### Próximos Passos
→ Ir para **FASE 2**

---

## 🔐 FASE 2: SEGURANÇA & BACKEND
**Status**: ⏳ Pendente  
**Timeline**: Junho 2026 (1-2 semanas)  
**Responsável**: Backend Team

### Objetivos
- [ ] JWT Authentication middleware
- [ ] RBAC (Role-Based Access Control)
- [ ] Soft delete + Audit log
- [ ] Validação centralizada (schemas)
- [ ] Rate limiting + CORS
- [ ] Error handling patterns

### Implementações

#### 2.1 JWT Authentication
```typescript
// middleware/auth.ts
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("No token provided");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
```

#### 2.2 RBAC Permissions
```typescript
// middleware/rbac.ts
export const requirePermission = (requiredPermission: string) => {
  return (req, res, next) => {
    const userPermissions = getPermissionsForRole(req.user.role);
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};

// Uso
app.delete('/knowledge/:id', 
  authMiddleware,
  requirePermission('DELETE_KNOWLEDGE'),
  deleteKnowledge
);
```

#### 2.3 Audit Log
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(50), -- CREATE, UPDATE, DELETE
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar trigger para auto-logging
CREATE TRIGGER audit_knowledge_items
AFTER INSERT OR UPDATE OR DELETE ON knowledge_items
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

#### 2.4 Soft Delete
```sql
-- Adicionar a todas as tabelas principais
ALTER TABLE knowledge_items ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE knowledge_items ADD COLUMN deleted_by UUID;

-- Query padrão (nunca mostrar deleted)
SELECT * FROM knowledge_items WHERE deleted_at IS NULL;
```

### Deliverables
- Todos endpoints protegidos por JWT
- Sistema RBAC com roles: admin, editor, viewer
- Audit log registrando todas operações
- 80% cobertura de testes

### Testes
```bash
npm test -- auth rbac audit
```

---

## ⚛️ FASE 3: FRONTEND MODERNO
**Status**: ⏳ Pendente  
**Timeline**: Junho-Julho 2026 (2-3 semanas)  
**Responsável**: Frontend Team

### Objetivos
- [ ] Migrar Vanilla JS → React + TypeScript
- [ ] Componentes reutilizáveis (Design System)
- [ ] State management (Zustand)
- [ ] Integração API completa
- [ ] Autenticação UI (login, logout, perfil)
- [ ] Dark mode + Responsivo

### Estrutura

```
frontend/src/
├── components/
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── knowledge/
│   │   ├── KnowledgeList.tsx
│   │   ├── KnowledgeCard.tsx
│   │   └── KnowledgeForm.tsx
│   ├── flows/
│   │   ├── FlowList.tsx
│   │   ├── FlowBuilder.tsx
│   │   └── FlowExecutor.tsx
│   └── ui/
│       ├── Dialog.tsx
│       ├── Input.tsx
│       └── Button.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Knowledge.tsx
│   ├── Flows.tsx
│   ├── Login.tsx
│   └── NotFound.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useKnowledge.ts
│   └── useFlows.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── stores/
│   ├── authStore.ts
│   ├── knowledgeStore.ts
│   └── flowStore.ts
└── App.tsx
```

### State Management (Zustand)

```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      set({ 
        user: res.data.user,
        token: res.data.token,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));
```

### Deliverables
- React app com 100% TypeScript
- Todos componentes com stories (Storybook)
- 75% cobertura de testes
- Acessibilidade AA nível

---

## 🔍 FASE 4: FEATURES CORE
**Status**: ⏳ Pendente  
**Timeline**: Julho 2026 (2-3 semanas)  
**Responsável**: Full Stack Team

### Objetivos
- [ ] Busca full-text + Filtros avançados
- [ ] Paginação inteligente
- [ ] Versionamento de documentos
- [ ] Fluxo de aprovação (workflow)
- [ ] Tags + Categorização
- [ ] Exportar (PDF, JSON, CSV)

#### 4.1 Busca Full-text

```typescript
// services/SearchService.ts
async search(query: string, filters: SearchFilters) {
  const sql = `
    SELECT * FROM knowledge_items
    WHERE deleted_at IS NULL
    AND (
      to_tsvector('portuguese', title) @@ to_tsquery('portuguese', $1)
      OR to_tsvector('portuguese', content) @@ to_tsquery('portuguese', $1)
    )
    ${filters.category ? 'AND category_id = $2' : ''}
    ${filters.tags?.length ? 'AND tags && $3' : ''}
    ORDER BY ts_rank(to_tsvector('portuguese', content), 
             to_tsquery('portuguese', $1)) DESC
    LIMIT $4 OFFSET $5
  `;
  
  return this.repo.query(sql, params);
}
```

#### 4.2 Versionamento

```sql
CREATE TABLE knowledge_items_versions (
  id UUID PRIMARY KEY,
  knowledge_item_id UUID NOT NULL,
  version_number INT,
  title VARCHAR(255),
  content TEXT,
  status VARCHAR(50),
  created_by UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (knowledge_item_id) REFERENCES knowledge_items(id)
);
```

#### 4.3 Fluxos de Aprovação

```
Estado: draft
  ↓ (submit)
Estado: pending_approval (aguarda revisor)
  ↓ (approve/reject)
Estado: published / rejected
```

### Deliverables
- Busca com latência < 200ms
- Versioning funcional
- Workflow de aprovação implementado
- Exportação em 3 formatos

---

## 🤖 FASE 5: IA & AUTOMAÇÃO
**Status**: ⏳ Pendente  
**Timeline**: Agosto 2026 (2-3 semanas)  
**Responsável**: IA/ML Team

### Objetivos
- [ ] Integração OpenAI (já tem API key!)
- [ ] Sugestões automáticas de categorias
- [ ] Resumos de documentos via IA
- [ ] Busca semântica (embeddings)
- [ ] Geração de fluxos automatizados
- [ ] Análise de sentimento

#### 5.1 Categorização Automática

```typescript
// services/AIService.ts
async suggestCategory(title: string, content: string) {
  const prompt = `
    Dado um documento com título e conteúdo, sugira a categoria mais apropriada
    entre: Segurança, Compliance, RH, Financeiro, Operacional, Outro
    
    Título: ${title}
    Conteúdo: ${content.substring(0, 500)}...
    
    Responda apenas com a categoria.
  `;
  
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });
  
  return response.choices[0].message.content;
}
```

#### 5.2 Resumo Automático

```typescript
async summarize(content: string): Promise<string> {
  const summary = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: `Resuma este documento em máximo 3 parágrafos:\n\n${content}`
    }]
  });
  
  return summary.choices[0].message.content;
}
```

#### 5.3 Busca Semântica

```typescript
async semanticSearch(query: string) {
  // Gerar embedding do query
  const queryEmbedding = await openai.createEmbedding({
    model: "text-embedding-3-small",
    input: query
  });
  
  // Buscar no banco com pgvector similarity
  const results = await this.repo.query(`
    SELECT *, 
      1 - (embedding <=> $1) as similarity
    FROM knowledge_items
    WHERE deleted_at IS NULL
    ORDER BY similarity DESC
    LIMIT 10
  `, [queryEmbedding.data[0].embedding]);
  
  return results;
}
```

### Deliverables
- Sugestões automáticas com 85%+ accuracy
- Resumos gerados em < 5s
- Busca semântica operacional
- Análise de compliance automática

---

## 📊 Milestones Gerais

| Data | Fase | Status | Objetivo |
|------|------|--------|----------|
| **29 de Maio** | 1 | ✅ Concluído | Setup + Infra |
| **12 de Junho** | 2 | 🔄 Em curso | Backend seguro |
| **26 de Junho** | 3 | ⏳ Planejado | React pronto |
| **10 de Julho** | 4 | ⏳ Planejado | Features core |
| **24 de Julho** | 5 | ⏳ Planejado | IA + MVP final |

---

## 🎯 Critérios de Sucesso

### Fase 1 ✅
- [x] Repositório funcional
- [x] Documentação completa
- [x] CI/CD pipeline

### Fase 2 (Próxima)
- [ ] 100% endpoints com autenticação
- [ ] Audit log com 100% coverage
- [ ] RBAC com testes e documentation

### Fase 3
- [ ] React app compilando sem warnings
- [ ] 80%+ test coverage
- [ ] Lighthouse score > 90

### Fase 4
- [ ] Busca < 200ms latency
- [ ] 95%+ uptime em staging
- [ ] Performance tests passing

### Fase 5
- [ ] IA suggestions > 80% accuracy
- [ ] Usuarios usando IA features daily
- [ ] Feedback score > 4.5/5

---

## 🚀 Próximas Ações

**HOJE:**
1. ✅ Fase 1 setup completo
2. Criar repositório no GitHub
3. Configurar Notion workspace

**PRÓXIMA SEMANA:**
1. Iniciar Fase 2 (Backend seguro)
2. Implementar JWT + RBAC
3. Setup CI/CD em Collify

**ROADMAP VISUAL:**

```
Maio    | FASE 1 ████
Junho   | FASE 2 ██████  FASE 3 ██████
Julho   | FASE 4 ██████  FASE 5 ██████
Agosto  | MVP PRONTO ✨
```

---

**Última atualização**: 29 de Maio de 2026  
**Próxima revisão**: 5 de Junho de 2026
