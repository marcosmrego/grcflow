FROM node:22-alpine AS backend-builder

WORKDIR /app

ENV NODE_ENV=development

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ---- Build React frontend ----
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

ENV NODE_ENV=development

COPY frontend-react/package*.json ./
RUN npm ci

COPY frontend-react/ ./
RUN npm run build

# ---- Imagem final ----
FROM node:22-alpine

WORKDIR /app

COPY --from=backend-builder /app/dist        ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json ./
COPY --from=frontend-builder /frontend/dist  ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
