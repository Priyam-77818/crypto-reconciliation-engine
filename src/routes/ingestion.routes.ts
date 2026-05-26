import { Router } from 'express';
import { ingestDefault, healthCheck } from '../controllers/ingestion.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', asyncHandler(healthCheck));

/**
 * @swagger
 * /ingest:
 *   post:
 *     summary: Ingest CSV files from configured paths
 *     tags: [Ingestion]
 *     responses:
 *       200:
 *         description: Ingestion completed
 *       500:
 *         description: Ingestion failed
 */
router.post('/ingest', asyncHandler(ingestDefault));

export default router;
