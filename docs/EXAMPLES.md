# Exemplos Práticos - GRC Flow

## 📚 Caso de Uso 1: Criar Base de Conhecimento sobre Governance

### Passo 1: Criar itens de conhecimento

```bash
# Item 1: Board Charter
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Governance",
    "title": "Board Charter",
    "description": "Documento fundamental que define a estrutura e responsabilidades do conselho",
    "content": "O conselho de administração é responsável pela supervisão estratégica e governança geral da organização. O conselho aprova políticas, monitora desempenho, e garante conformidade com regulamentações.",
    "tags": ["governance", "board", "approved"]
  }'

# Item 2: Audit Committee Charter
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Governance",
    "title": "Audit Committee Charter",
    "description": "Charter que define responsabilidades do comitê de auditoria",
    "content": "O comitê de auditoria supervisiona a integridade dos relatórios financeiros, a independência dos auditores e a eficácia dos controles internos.",
    "tags": ["governance", "audit", "approved"]
  }'

# Item 3: Risk Management Policy
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Risk Management",
    "title": "Enterprise Risk Management Policy",
    "description": "Política marco para gestão de riscos em toda a organização",
    "content": "Esta política estabelece a abordagem integrada para identificação, avaliação, mitigação e monitoramento de riscos em todos os níveis da organização.",
    "tags": ["risk", "management", "policy"]
  }'
```

### Passo 2: Buscar na base de conhecimento

```bash
# Buscar por categoria
curl "http://localhost:3000/api/knowledge/category/Governance"

# Buscar por tag
curl "http://localhost:3000/api/knowledge/tag/governance"

# Buscar com query
curl "http://localhost:3000/api/knowledge/search?q=governance"
```

---

## 🔄 Caso de Uso 2: Criar Fluxo de Risk Assessment

### Passo 1: Criar o fluxo

```bash
FLOW_ID=$(curl -s -X POST http://localhost:3000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quarterly Risk Assessment",
    "description": "Processo trimestral de avaliação de riscos",
    "status": "draft",
    "metadata": {
      "frequency": "quarterly",
      "owner": "Risk Management Team",
      "department": "Enterprise Risk"
    }
  }' | jq -r '.id')

echo "Flow ID: $FLOW_ID"
```

### Passo 2: Adicionar passos ao fluxo

```bash
# Passo 1: Identificar Riscos
curl -X POST "http://localhost:3000/api/flows/$FLOW_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "order": 1,
    "title": "Identificar Riscos",
    "description": "Identificar riscos potenciais em cada área operacional",
    "type": "action",
    "inputs": {"department": "string", "period": "Q1-Q4"},
    "outputs": {"identified_risks": "array"},
    "nextSteps": ["step-2"]
  }'

# Passo 2: Avaliar Riscos
curl -X POST "http://localhost:3000/api/flows/$FLOW_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "order": 2,
    "title": "Avaliar Riscos",
    "description": "Avaliar impacto e probabilidade de cada risco",
    "type": "decision",
    "inputs": {"identified_risks": "array"},
    "outputs": {"risk_scores": "object"},
    "nextSteps": ["step-3"]
  }'

# Passo 3: Definir Mitigações
curl -X POST "http://localhost:3000/api/flows/$FLOW_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "order": 3,
    "title": "Definir Estratégias de Mitigação",
    "description": "Definir planos de mitigação para riscos críticos",
    "type": "action",
    "inputs": {"risk_scores": "object"},
    "outputs": {"mitigation_plans": "array"},
    "nextSteps": ["step-4"]
  }'

# Passo 4: Aprovação
curl -X POST "http://localhost:3000/api/flows/$FLOW_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "order": 4,
    "title": "Aprovação Executiva",
    "description": "Executivos aprovam planos de mitigação",
    "type": "decision",
    "inputs": {"mitigation_plans": "array"},
    "outputs": {"approved": "boolean"},
    "nextSteps": []
  }'
```

### Passo 3: Publicar o fluxo

```bash
curl -X PUT "http://localhost:3000/api/flows/$FLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "metadata": {
      "version": "1.0",
      "published_date": "2026-05-28"
    }
  }'
```

---

## 🎓 Caso de Uso 3: Organizar Políticas de Compliance

```bash
# Política 1: Data Privacy
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Compliance",
    "title": "Data Privacy Policy (GDPR Compliant)",
    "description": "Política de privacidade de dados em conformidade com GDPR",
    "content": "Todos os dados pessoais devem ser coletados, processados e armazenados em conformidade com GDPR. A organização deve designar um DPO e manter registros de processamento.",
    "tags": ["compliance", "privacy", "gdpr", "urgent"]
  }'

# Política 2: Information Security
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Compliance",
    "title": "Information Security Policy",
    "description": "Política de segurança da informação",
    "content": "Esta política estabelece os requisitos para proteção de ativos de informação, controles de acesso, criptografia e resposta a incidentes de segurança.",
    "tags": ["compliance", "security", "iso27001"]
  }'

# Política 3: Code of Conduct
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Policies",
    "title": "Code of Conduct",
    "description": "Código de conduta para todos os colaboradores",
    "content": "Todos os colaboradores devem aderir aos mais altos padrões éticos e profissionais, incluindo honestidade, respeito e conformidade com leis.",
    "tags": ["policies", "conduct", "ethics"]
  }'
```

---

## 📊 Caso de Uso 4: Dashboard de Fluxos em Andamento

### Consultar fluxos ativos

```bash
# Listar todos os fluxos publicados
curl "http://localhost:3000/api/flows?status=published"

# Listar fluxos em rascunho
curl "http://localhost:3000/api/flows?status=draft"

# Obter detalhes completo de um fluxo com todos os passos
curl "http://localhost:3000/api/flows/{flow_id}"
```

---

## 🤖 Caso de Uso 5: Preparação para IA (Futuro)

Com a integração de IA, você será capaz de:

### Gerar fluxo automaticamente
```typescript
// Exemplo futuro
const flow = await aiService.generateFlowFromKnowledge(knowledgeItemId);
// Resultado: fluxo com passos sugeridos pela IA
```

### Melhorar descrição de fluxo
```typescript
// Exemplo futuro
await aiService.enhanceFlowDescription(flowId);
// IA expande e melhora a descrição do fluxo
```

### Sugerir otimizações
```typescript
// Exemplo futuro
const suggestions = await aiService.suggestOptimizations(flowId);
// IA sugere melhorias no fluxo com base em melhores práticas
```

---

## 📈 Evolução Gradual Recomendada

### Semana 1-2: Construir a Base de Conhecimento
1. Adicionar todas as políticas importantes
2. Organizar por categorias
3. Taggear corretamente
4. Testar busca e filtros

### Semana 3-4: Criar Fluxos de Processos
1. Mapear 3-5 fluxos principais
2. Definir passos e responsabilidades
3. Documentar inputs/outputs
4. Validar com stakeholders

### Semana 5-6: Interface Web
1. Dashboard de conhecimento
2. Editor visual de fluxos
3. Sistema de usuários

### Semana 7-8: Integração com IA
1. Conectar OpenAI
2. Gerar fluxos automaticamente
3. Sugestões de conformidade

---

## 🔍 Dicas para Sucesso

### 1️⃣ Taxonomia Clara
- Use categorias consistentes
- Tags bem definidas
- Descrições descritivas

### 2️⃣ Fluxos Bem Estruturados
- Passos bem definidos
- Responsabilidades claras
- Validações adequadas

### 3️⃣ Documentação Completa
- Metadata rica em fluxos
- Descrições detalhadas de passos
- Exemplos de inputs/outputs

### 4️⃣ Pronto para IA
- Dados estruturados
- Padrões consistentes
- Histórico de execuções (futuro)

---

## 🧪 Scripts de Teste Rápido

```bash
# Testar saúde da API
curl http://localhost:3000/health

# Contar itens
curl http://localhost:3000/api/knowledge | jq 'length'

# Busca específica
curl "http://localhost:3000/api/knowledge/search?q=governance" | jq '.[] | {id, title}'

# Visualizar estrutura de um fluxo
curl http://localhost:3000/api/flows/{flow_id} | jq '{name, steps: (.steps | length), status}'
```

---

Sucesso no desenvolvimento do seu sistema GRC Flow! 🚀
