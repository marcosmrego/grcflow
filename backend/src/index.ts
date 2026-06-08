import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { runMigrations } from './database/migrations';
import knowledgeRoutes from './routes/knowledge';
import flowsRoutes from './routes/flows';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import companiesRoutes from './routes/companies';
import systemAuthRoutes from './routes/systemAuth';
import systemUsersRoutes from './routes/systemUsers';
import {
  auditContextMiddleware,
  generalLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.cors.origin || '*', credentials: true }));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(auditContextMiddleware);

// Frontend estático
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString(), environment: config.server.nodeEnv } });
});

// API
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/system/auth', systemAuthRoutes);
app.use('/api/system/users', systemUsersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.server.port;

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║         GRC Flow API Started           ║`);
      console.log(`╚════════════════════════════════════════╝`);
      console.log(`\nServer:   http://localhost:${PORT}`);
      console.log(`Env:      ${config.server.nodeEnv}`);
      console.log(`DB:       ${config.database.host}/${config.database.database} (schema: ${config.database.schema})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
