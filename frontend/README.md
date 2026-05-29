# Frontend GRC Flow

Frontend profissional em **HTML5, CSS3 e JavaScript puro** (sem frameworks).

## 🎨 Características

✅ Design responsivo e moderno
✅ UI intuitiva e clean
✅ Integração completa com API REST
✅ Dashboard com estatísticas
✅ Gerenciamento de conhecimento
✅ Gerenciamento de fluxos de processos
✅ Modais para CRUD operations
✅ Busca e filtros avançados
✅ Badges e status visuais
✅ Tabelas e grids dinâmicos

## 📁 Estrutura

```
frontend/
├── index.html              # Dashboard principal
├── pages/
│   ├── knowledge.html      # Gerenciador de conhecimento
│   └── flows.html          # Gerenciador de fluxos
├── css/
│   ├── style.css          # Estilos globais
│   ├── dashboard.css      # Estilos do dashboard
│   └── flows.css          # Estilos dos fluxos
├── js/
│   ├── api.js             # Cliente HTTP para API
│   ├── dashboard.js       # Lógica do dashboard
│   ├── knowledge.js       # Lógica de conhecimento
│   └── flows.js           # Lógica de fluxos
└── assets/                # Imagens e recursos (futuro)
```

## 🚀 Como Usar

### 1. Abrir no Navegador

```bash
# Windows
start index.html

# Linux
xdg-open index.html

# macOS
open index.html
```

Ou use um servidor HTTP local:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

### 2. Certificar que o Backend está Rodando

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Servidor rodando em http://localhost:3000

# Terminal 2 - Frontend
cd frontend
python -m http.server 8000
# Frontend rodando em http://localhost:8000
```

## 📄 Páginas Principais

### Dashboard (`index.html`)
- Estatísticas gerais
- Itens de conhecimento recentes
- Fluxos de processos recentes
- Categorias
- Status da API

### Base de Conhecimento (`pages/knowledge.html`)
- Listar todos os itens
- Criar novo item
- Buscar por texto
- Filtrar por categoria
- Filtrar por tags
- Editar item
- Deletar item
- Visualizar detalhes

### Fluxos de Processos (`pages/flows.html`)
- Listar todos os fluxos
- Criar novo fluxo
- Buscar fluxos
- Filtrar por status
- Visualizar detalhes
- Ver passos do fluxo
- Editar fluxo
- Deletar fluxo

## 🔌 Integração com API

O arquivo `js/api.js` fornece uma interface limpa para comunicação com o backend:

```javascript
// Buscar conhecimento
const items = await API.getKnowledge(limit, offset);

// Criar conhecimento
await API.createKnowledge({
    category: 'Governance',
    title: 'Board Charter',
    description: '...',
    content: '...',
    tags: ['governance']
});

// Buscar fluxos
const flows = await API.getFlows(status);

// Criar fluxo
await API.createFlow({
    name: 'Risk Assessment',
    description: '...',
    status: 'draft'
});
```

## 🎯 URLs da API Utilizadas

### Knowledge
```
GET     /api/knowledge
GET     /api/knowledge/:id
GET     /api/knowledge/search?q=...
GET     /api/knowledge/category/:category
GET     /api/knowledge/tag/:tag
POST    /api/knowledge
PUT     /api/knowledge/:id
DELETE  /api/knowledge/:id
```

### Flows
```
GET     /api/flows
GET     /api/flows/:id
GET     /api/flows?status=draft
POST    /api/flows
POST    /api/flows/:flowId/steps
PUT     /api/flows/:id
DELETE  /api/flows/:id
```

## 🎨 Temas de Cores

```css
--primary: #0066cc         /* Azul principal */
--success: #28a745         /* Verde */
--danger: #dc3545          /* Vermelho */
--warning: #ffc107         /* Amarelo */
--info: #17a2b8            /* Ciano */
```

## 📱 Responsividade

O frontend é totalmente responsivo:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (< 768px)

## ⌨️ Atalhos de Teclado (Futuro)

```
Ctrl+K    Abrir busca
Ctrl+N    Novo item
Ctrl+E    Editar
Ctrl+D    Deletar
Esc       Fechar modal
```

## 🔐 Segurança

- XSS Protection (escaping de HTML)
- CORS habilitado na API
- Validação de entrada no frontend
- Tratamento de erros robusto

## 🌐 CORS Configuration

Se receber erro de CORS, configure o backend:

```javascript
// backend/src/index.ts
app.use(cors({
    origin: 'http://localhost:8000',
    credentials: true
}));
```

## 📊 Performance

- Sem frameworks (carrega rápido)
- CSS minificado (futuro)
- JavaScript otimizado
- Lazy loading de dados
- Caching local (futuro)

## 🚀 Evolução Futura

- [ ] Framework SPA (React/Vue)
- [ ] Service Workers (PWA)
- [ ] Temas Dark/Light
- [ ] Internacionalização (i18n)
- [ ] WebSockets para real-time
- [ ] Drag & drop para fluxos
- [ ] Exportar em PDF
- [ ] Gráficos e visualizações

## 🛠️ Desenvolvimento

### Estrutura de Componentes

Componentes reutilizáveis em JavaScript:

```javascript
const MyComponent = {
    render() {
        return '<div>...</div>';
    },
    
    init() {
        // Setup
    },
    
    destroy() {
        // Cleanup
    }
};
```

### Padrão de Modal

```javascript
toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}
```

## 🧪 Testing

```bash
# No futuro, adicionar testes com Jest
npm test

# Coverage
npm run test:coverage
```

## 📚 Recursos

- [MDN Web Docs](https://developer.mozilla.org)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [API Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## 📝 Notas

- Sem dependências externas (vanilla JS)
- Compatível com navegadores modernos
- Mobile-first design
- Acessibilidade em desenvolvimento

---

**Status**: Pronto para produção (v0.1.0)
