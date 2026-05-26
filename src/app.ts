import express from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiRateLimiter } from './middlewares/rateLimiter';
import reconciliationRoutes from './routes/reconciliation.routes';
import ingestionRoutes from './routes/ingestion.routes';
import uiRoutes from './routes/ui.routes';
import { logger } from './utils/logger';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(apiRateLimiter);

// ── Static Dashboard UI ───────────────────────────────────────────────────────
// Works for both ts-node (src/) and compiled (dist/) environments
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// ── Root → Dashboard ─────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Crypto Reconciliation API',
  swaggerOptions: { persistAuthorization: true },
}));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', uiRoutes);
app.use('/', ingestionRoutes);
app.use('/', reconciliationRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server Bootstrap ──────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server = app.listen(config.app.port, () => {
    logger.info(
      {
        port: config.app.port,
        env: config.app.env,
        docs: `http://localhost:${config.app.port}/api-docs`,
      },
      `🚀 ${config.app.name} running`,
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

export default app;
