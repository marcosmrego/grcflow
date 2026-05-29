# API Reference - GRC Flow

**Base URL**: `https://api.seu-dominio.com/api/v1`

## Autenticação

Todas as requisições requerem JWT no header:

```bash
Authorization: Bearer {token}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha-segura"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "refresh_...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Nome",
      "role": "admin"
    }
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_..."
}

Response 200:
{
  "success": true,
  "data": {
    "token": "eyJhbGc..."
  }
}
```

## Knowledge Items

### Listar Knowledge Items
```http
GET /knowledge?page=1&limit=20&search=termo&category=categorie-id&status=published

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Política de Segurança",
        "description": "Descrição breve",
        "category": { "id": "uuid", "name": "Segurança" },
        "tags": ["segurança", "compliance"],
        "status": "published",
        "createdBy": { "id": "uuid", "name": "Admin" },
        "createdAt": "2026-05-29T10:00:00Z",
        "updatedAt": "2026-05-29T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "hasNext": true
    }
  }
}
```

### Criar Knowledge Item
```http
POST /knowledge
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Nova Política",
  "description": "Descrição",
  "content": "Conteúdo completo em Markdown",
  "category_id": "uuid",
  "tags": ["segurança", "novo"],
  "status": "draft"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Nova Política",
    ...
  }
}
```

### Obter Detalhes
```http
GET /knowledge/{id}

Response 200:
{
  "success": true,
  "data": { ... }
}
```

### Atualizar Knowledge Item
```http
PUT /knowledge/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Título Atualizado",
  "status": "published"
}

Response 200:
{
  "success": true,
  "data": { ... }
}
```

### Deletar Knowledge Item
```http
DELETE /knowledge/{id}
Authorization: Bearer {token}

Response 204: No Content
```

## Process Flows

### Listar Process Flows
```http
GET /flows?page=1&limit=20&status=published

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Fluxo de Aprovação",
        "description": "Descrição",
        "status": "published",
        "steps": [
          {
            "id": "uuid",
            "order": 1,
            "name": "Enviar para aprovação",
            "type": "action",
            "inputs": { ... },
            "outputs": { ... }
          }
        ],
        "createdAt": "2026-05-29T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### Criar Process Flow
```http
POST /flows
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Fluxo",
  "description": "Descrição do fluxo",
  "status": "draft",
  "steps": [
    {
      "order": 1,
      "name": "Passo 1",
      "type": "action",
      "inputs": { "field1": "value1" }
    }
  ]
}

Response 201:
{
  "success": true,
  "data": { ... }
}
```

### Executar Flow
```http
POST /flows/{id}/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "data": { "key": "value" }
}

Response 200:
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "status": "completed",
    "results": { ... }
  }
}
```

## Categorias

### Listar Categorias
```http
GET /categories

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Segurança",
      "description": "Políticas de segurança",
      "count": 25
    }
  ]
}
```

## Tags

### Obter Tags Populares
```http
GET /tags?limit=20

Response 200:
{
  "success": true,
  "data": [
    {
      "name": "segurança",
      "count": 45
    }
  ]
}
```

## Search (Full-text)

### Busca Avançada
```http
GET /search?q=termo&type=knowledge,flows&category=uuid&tags=tag1,tag2&from=2026-01-01&to=2026-05-29

Response 200:
{
  "success": true,
  "data": {
    "knowledge": [ ... ],
    "flows": [ ... ],
    "total": 50
  }
}
```

## Audit Logs

### Listar Audit Logs (Admin only)
```http
GET /audit-logs?entity_type=knowledge_items&entity_id=uuid&action=CREATE&page=1

Response 200:
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "entity_type": "knowledge_items",
        "entity_id": "uuid",
        "action": "CREATE",
        "user": { "id": "uuid", "email": "user@example.com" },
        "changes": { "title": { "old": null, "new": "Nova" } },
        "ip_address": "192.168.1.1",
        "created_at": "2026-05-29T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

## Error Handling

### Erro de Validação
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validação falhou",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

### Erro de Autenticação
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token inválido ou expirado"
  }
}
```

### Erro de Autorização
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Você não tem permissão para realizar esta ação"
  }
}
```

### Erro de Servidor
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Erro interno do servidor"
  }
}
```

## Rate Limiting

Limites por IP/usuário:
- **Geral**: 100 requisições / minuto
- **Login**: 5 tentativas / 15 minutos
- **Upload**: 10 requisições / minuto

Header de resposta:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622299200
```

## Pagination

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "pages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Query parameters:
- `page`: número da página (padrão: 1)
- `limit`: items por página (padrão: 20, máximo: 100)
