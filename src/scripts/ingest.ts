/**
 * Standalone ingestion script.
 * Usage: ts-node src/scripts/ingest.ts
 */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { IngestionService } from '../services/ingestion.service';
import { config } from '../config';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  logger.info('Starting standalone ingestion script');

  await connectDatabase();

  const service = new IngestionService();
  const result = await service.ingestBoth(
    config.csv.userCsvPath,
    config.csv.exchangeCsvPath,
  );

  logger.info({ result }, 'Ingestion script completed');
  console.log('\n=== Ingestion Results ===');
  console.log('User CSV:', JSON.stringify(result.user, null, 2));
  console.log('Exchange CSV:', JSON.stringify(result.exchange, null, 2));

  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Ingestion script failed');
  process.exit(1);
});
