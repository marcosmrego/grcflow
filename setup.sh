#!/bin/bash

# GRC Flow Setup Script

set -e

echo "🚀 GRC Flow Setup"
echo "================="
echo ""

# Check Node.js
echo "✓ Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js não encontrado. Instale Node.js 16+."
    exit 1
fi
echo "  Node.js: $(node --version)"

# Check npm
echo "✓ Verificando npm..."
if ! command -v npm &> /dev/null; then
    echo "✗ npm não encontrado."
    exit 1
fi
echo "  npm: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Instalando dependências..."
cd backend
npm install

echo ""
echo "⚙️  Configurando ambiente..."

# Create .env if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "  Criando arquivo .env..."
    cp backend/.env.example backend/.env
    echo "  ⚠️  IMPORTANTE: Atualize o arquivo backend/.env com suas credenciais!"
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "1. Configure o PostgreSQL:"
echo "   - Crie um banco de dados 'grc_flow'"
echo "   - Crie um usuário 'grc_user'"
echo ""
echo "2. Execute as migrações:"
echo "   npm run db:migrate"
echo ""
echo "3. (Opcional) Popule com dados de exemplo:"
echo "   npm run db:seed"
echo ""
echo "4. Inicie o servidor:"
echo "   npm run dev"
echo ""
echo "O servidor estará disponível em: http://localhost:3000"
echo ""
