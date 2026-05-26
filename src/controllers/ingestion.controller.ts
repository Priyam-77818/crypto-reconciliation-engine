import { Request, Response } from 'express';
import { IngestionService } from '../services/ingestion.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const ingestionService = new IngestionService();

/**
 * POST /ingest
 * Ingests both CSV files from configured paths.
 * Optionally accepts custom paths via request body.
 */
export async function ingestDefault(req: Request, res: Response): Promise<void> {
  const userCsvPath: string = (req.body?.userCsvPath as string) ?? config.csv.userCsvPath;
  const exchangeCsvPath: string =
    (req.body?.exchangeCsvPath as string) ?? config.csv.exchangeCsvPath;

  logger.info({ userCsvPath, exchangeCsvPath }, 'Starting CSV ingestion via API');

  const result = await ingestionService.ingestBoth(userCsvPath, exchangeCsvPath);

  res.status(200).json({
    success: true,
    message: 'Ingestion completed',
    data: result,
  });
}

/**
 * GET /health
 * Health check endpoint.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: 'ok',
    service: config.app.name,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
  });
}
