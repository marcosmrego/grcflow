import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import knowledgeRoutes from './routes/knowledge';
import flowsRoutes from './routes/flows';
import {
  authMiddleware,
  auditContextMiddleware,
  generalLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware';

const app = express();

// Security and parsing middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin || '*',
  credentials: true,
}));
app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit and context middleware
app.use(auditContextMiddleware);

// Health check (public endpoint)
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    data: {
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
    }
  });
});

// API routes
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/flows', flowsRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║         🚀 GRC Flow API Started        ║
╚════════════════════════════════════════╝

Server:      http://localhost:${PORT}
Environment: ${config.server.nodeEnv}
Database:    ${config.database.host}:${config.database.port}/${config.database.database}
CORS Origin: ${config.cors.origin || '*'}

API Documentation: http://localhost:${PORT}/api/docs
Health Check:      http://localhost:${PORT}/health
  `);
});

export default app;
