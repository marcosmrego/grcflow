FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY backend/package*.json ./
RUN npm ci

# Compilar TypeScript
COPY backend/ ./
RUN npm run build

# Copiar frontend como arquivos estáticos
COPY frontend/ ./public/

# ---- Imagem final ----
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/public      ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
