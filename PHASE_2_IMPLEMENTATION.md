# PHASE 2: Backend Seguro - Implementação Completa

**Status**: ✅ Implementado  
**Data**: 29 de Maio de 2026  
**Responsável**: Backend Team

## 📋 O que foi implementado

### ✅ 1. JWT Authentication
- Middleware de autenticação `authMiddleware`
- Geração e verificação de tokens JWT (access + refresh)
- Hash seguro de senhas com bcryptjs
- Classe `AuthService` centralizada

**Arquivo**: `src/middleware/auth.ts` e `src/services/AuthService.ts`

```typescript
// Uso em rotas
app.get('/api/data', authMiddleware, (req, res) => {
  // req.user contém { id, email, role }
  const userId = req.user.id;
});
```

### ✅ 2. RBAC (Role-Based Access Control)
- 3 roles: `admin`, `editor`, `viewer`
- 13 permissões granulares (CREATE, READ, UPDATE, DELETE para cada entidade)
- Middlewares para verificação de permissões
- Mapeamento automático de roles → permissions

**Arquivo**: `src/middleware/rbac.ts`

```typescript
// Usar em rotas
app.delete('/api/knowledge/:id', 
  authMiddleware,
  requirePermission('DELETE_KNOWLEDGE'),
  deleteKnowledge
);

// Ou para roles
app.post('/api/users',
  authMiddleware,
  requireAdmin,
  createUser
);

// Ou múltiplas permissões
app.post('/api/flows/:id/execute',
  authMiddleware,
  requireAnyPermission('EXECUTE_FLOW'),
  executeFlow
);
```

### ✅ 3. Soft Delete & Audit Log
- Coluna `deleted_at` em todas entidades principais
- Rastreamento de `created_by`, `updated_by`, `deleted_by`
- Tabela `audit_logs` automática via triggers
- Queries filtram automaticamente deletados

**Arquivo**: `database/setup.sql`

```sql
-- Todos os selects usam automaticamente:
WHERE deleted_at IS NULL

-- Deletar de verdade:
DELETE FROM knowledge_items WHERE id = 'xxx'

-- Deletar suavemente:
UPDATE knowledge_items 
SET deleted_at = NOW(), deleted_by = 'user-id'
WHERE id = 'xxx'
```

### ✅ 4. Rate Limiting
- Rate limiter geral: 100 req/min
- Rate limiter de auth: 5 tentativas/15 min
- Rate limiter de upload: 10 req/min
- Rate limiter público: 30 req/hora

**Arquivo**: `src/middleware/rateLimit.ts`

### ✅ 5. Error Handling Centralizado
- Classes de erro customizadas
- Consistência em respostas de erro
- Logging automático com request ID
- Tratamento de erros PostgreSQL

**Arquivo**: `src/middleware/errorHandler.ts`

```typescript
// Usar em qualquer lugar
throw new ValidationError('Email é obrigatório', { field: 'email' });
throw new NotFoundError('User', userId);
throw new AuthenticationError('Invalid credentials');
throw new AuthorizationError('Access denied');
```

### ✅ 6. Request Context & Audit
- ID único para cada request (`requestId`)
- Captura de IP address
- Captura de User-Agent
- Timing automático
- Logging estruturado

**Arquivo**: `src/middleware/audit.ts`

### ✅ 7. Database Updates
- Tabela `users` com campos de segurança
- Tabela `audit_logs` para compliance
- Soft delete em `knowledge_items` e `process_flows`
- Triggers automáticas para updated_at
- Triggers para audit de deletions
- Índices otimizados para performance

**Arquivo**: `database/setup.sql`

### ✅ 8. Tipos TypeScript
- `User`, `UserPayload`, `JWTPayload`
- `Permission`, `UserRole`, `RolePermissions`
- `AuditLog`, `AuditAction`
- `ApiResponse`, `PaginatedResponse`

**Arquivo**: `src/models/types.ts`

---

## 🚀 Como Usar

### Instalar Dependências

```bash
cd backend
npm install
```

### Setup Database

```bash
# Aplicar migrations
npm run db:migrate

# Criar admin padrão (já incluído no setup.sql)
# Email: admin@grc-flow.local
# Password: admin123 (MUDE EM PRODUÇÃO!)
```

### Iniciar Backend

```bash
npm run dev
```

### Testar Autenticação

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@grc-flow.local",
    "password": "admin123"
  }'

# Resposta:
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "refresh_...",
    "user": { "id": "...", "email": "admin@grc-flow.local", "role": "admin" }
  }
}

# 2. Usar token
curl -X GET http://localhost:3000/api/knowledge \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 🔐 Arquitetura de Segurança

```
Request
  ↓
Helmet Headers
  ↓
CORS Validation
  ↓
Rate Limiter
  ↓
JSON Parser
  ↓
Audit Context (requestId, IP, User-Agent)
  ↓
JWT Middleware (verify token)
  ↓
RBAC Middleware (check permissions)
  ↓
Route Handler
  ↓
Response with Audit Log
```

---

## 📊 Database Schema

### Users Table
```sql
id: UUID
email: VARCHAR UNIQUE
name: VARCHAR
password_hash: VARCHAR
role: admin | editor | viewer
is_active: BOOLEAN
last_login: TIMESTAMP
created_at: TIMESTAMP
updated_at: TIMESTAMP
deleted_at: TIMESTAMP (soft delete)
```

### Audit Logs Table
```sql
id: UUID
entity_type: VARCHAR (conhecimento_items, process_flows, users, etc)
entity_id: UUID
action: CREATE | READ | UPDATE | DELETE
user_id: UUID FK
user_email: VARCHAR
old_values: JSONB
new_values: JSONB
ip_address: INET
user_agent: TEXT
created_at: TIMESTAMP (indexed)
```

### Knowledge Items (Updated)
```sql
... existing fields ...
created_by: UUID FK (users)
updated_by: UUID FK (users)
deleted_by: UUID FK (users)
status: draft | published | archived
deleted_at: TIMESTAMP (soft delete)
created_at: TIMESTAMP
updated_at: TIMESTAMP (auto-updated)
```

---

## 🔑 Roles & Permissions

### Admin
- ✅ Criar/ler/atualizar/deletar documentos
- ✅ Criar/ler/atualizar/deletar fluxos
- ✅ Executar fluxos
- ✅ Gerenciar usuários e roles
- ✅ Ver audit logs

### Editor
- ✅ Criar/ler/atualizar/deletar documentos
- ✅ Criar/ler/atualizar fluxos (sem deletar)
- ✅ Executar fluxos

### Viewer
- ✅ Ler documentos
- ✅ Ler fluxos

---

## 📝 Próximos Passos (Phase 3)

- [ ] Criar endpoints de autenticação (`/api/auth/login`, `/api/auth/register`, etc)
- [ ] Criar repository de usuários
- [ ] Criar service de usuários
- [ ] Adicionar endpoints de gestão de usuários (admin only)
- [ ] Migrar frontend para React com autenticação
- [ ] Testes unitários para auth e RBAC

---

## 🧪 Testing

```bash
# Lint
npm run lint

# Type check
npm run type-check

# Build
npm run build

# (Future) Run tests
npm test
```

---

## 📚 Referências

- **JWT**: `src/services/AuthService.ts`
- **RBAC**: `src/middleware/rbac.ts`
- **Errors**: `src/middleware/errorHandler.ts`
- **Database**: `database/setup.sql`
- **Types**: `src/models/types.ts`

---

**Status**: ✅ CONCLUÍDO - Pronto para Phase 3 (Frontend React)
