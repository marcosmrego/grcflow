# Contributing to GRC Flow

Obrigado por considerar contribuir ao GRC Flow! Este documento fornece diretrizes para contribuir.

## 📋 Código de Conduta

- Seja respeitoso
- Inclua pessoas de diferentes backgrounds
- Foque em crítica construtiva
- Reporte comportamento inaceitável para contato@expansaoai.com

## 🎯 Como Contribuir

### Reportar Bugs

1. Use o título descritivo
2. Descreva os passos exatos para reproduzir
3. Forneça exemplos específicos
4. Descreva o comportamento observado e esperado
5. Inclua screenshots/logs se relevante

**Template**:
```
**Descrição do bug**
Uma descrição clara e concisa de qual é o bug.

**Passos para reproduzir**
1. Vá para '...'
2. Clique em '....'
3. Role para '....'
4. Veja o erro

**Comportamento esperado**
Descrição clara de qual é o comportamento esperado.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome]
- Node version: [e.g. 18.0.0]
```

### Sugerir Enhancements

1. Use um título claro e descritivo
2. Forneça descrição passo-a-passo
3. Forneça exemplos específicos
4. Descreva o comportamento atual e o sugerido
5. Explique por que seria útil

### Pull Requests

1. **Faça um fork** do repositório
2. **Crie uma branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** com mensagens claras (`git commit -m 'Add amazing feature'`)
4. **Push** para a branch (`git push origin feature/amazing-feature`)
5. **Abra um Pull Request** com descrição detalhada

#### Checklist para PR

- [ ] Meu código segue o style guide deste projeto
- [ ] Executei `npm run lint` e `npm test`
- [ ] Adicionei testes para novas features
- [ ] Atualizei documentação se necessário
- [ ] Meu PR tem descrição clara do que muda

---

## 🎨 Styleguide

### Commits

```
[TIPO] Descrição breve

Descrição detalhada se necessário.

- Ponto 1
- Ponto 2

Closes #123
```

**Tipos**:
- `feat`: Nova feature
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatting (não muda código)
- `refactor`: Refatoração
- `perf`: Melhoria de performance
- `test`: Testes
- `chore`: Ferramentas/dependências

**Exemplo**:
```
feat: Adicionar autenticação JWT

- Implementar middleware de JWT
- Adicionar login endpoint
- Configurar refresh tokens

Closes #42
```

### Código TypeScript

```typescript
// ✅ Bom
interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export async function getUser(id: string): Promise<User> {
  // código
}

// ❌ Ruim
function getUser(id) {
  // código
}
```

### Mensagens de Erro

```typescript
// ✅ Bom - Claro e acionável
throw new Error('User with email already exists. Please use different email or reset password.');

// ❌ Ruim - Vago
throw new Error('Error');
```

### Comentários

```typescript
// ✅ Bom - Explica o "por quê"
// Soft delete permite recuperação de dados em compliance audits
const deletedAt = new Date();

// ❌ Ruim - Óbvio
// Set deleted at to now
const deletedAt = new Date();
```

---

## 🧪 Testing

```bash
# Antes de fazer PR, certifique-se que tudo passa:
npm run lint    # ESLint
npm run test    # Tests
npm run build   # Build check
```

---

## 📚 Documentação

Se você adiciona uma nova feature:

1. Documente em `docs/API.md` se for endpoint
2. Atualize `ARCHITECTURE.md` se for mudança arquitetural
3. Atualize `ROADMAP.md` se for mudança de timeline
4. Adicione JSDoc comments no código

---

## 🚀 Release Process

1. Bump version em `package.json` (semver)
2. Crie um git tag
3. Descreva changes em release notes
4. Deploy via Collify

---

## ❓ Perguntas?

- 📖 Veja [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- 🔗 Veja [API.md](./docs/API.md)
- 📋 Veja [ROADMAP.md](./docs/ROADMAP.md)
- 📧 Email: contato@expansaoai.com

---

**Obrigado por contribuir! 🙏**
