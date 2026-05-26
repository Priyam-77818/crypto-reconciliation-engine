/**
 * Standalone reconciliation script.
 * Usage: ts-node src/scripts/runReconciliation.ts
 */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { ReconciliationService } from '../services/reconciliation.service';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  logger.info('Starting standalone reconciliation script');

  await connectDatabase();

  const service = new ReconciliationService();
  const result = await service.triggerRun();

  console.log('\n=== Reconciliation Results ===');
  console.log(JSON.stringify(result, null, 2));

  // Print summary report
  const report = await service.getSummary(result.runId);
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report, null, 2));

  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Reconciliation script failed');
  process.exit(1);
});
