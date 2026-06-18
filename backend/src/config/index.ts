import dotenv from 'dotenv';

dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// Em produção, exige que segredos sejam definidos explicitamente em vez de cair
// silenciosamente em um valor padrão inseguro e previsível.
function requireInProduction(value: string | undefined, envVar: string, devFallback: string): string {
  if (value) return value;
  if (isProduction) {
    throw new Error(`Variável de ambiente obrigatória ausente em produção: ${envVar}`);
  }
  return devFallback;
}

export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'grc_flow',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  },
  jwt: {
    secret: requireInProduction(process.env.JWT_SECRET, 'JWT_SECRET', 'dev-only-insecure-secret-do-not-use-in-production'),
  },
  cors: {
    origin: requireInProduction(process.env.CORS_ORIGIN, 'CORS_ORIGIN', '*'),
  },
};
