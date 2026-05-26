import { v4 as uuidv4 } from 'uuid';
import { parseCsvFile } from './csvParser.service';
import { RawTransactionRepository } from '../repositories/rawTransaction.repository';
import { NormalizedTransactionRepository } from '../repositories/normalizedTransaction.repository';
import { RejectedRowRepository } from '../repositories/rejectedRow.repository';
import { validateRawRow } from '../validators/transaction.validator';
import {
  normalizeAsset,
  normalizeType,
  parseTimestamp,
  parseNumber,
} from '../utils/normalizer';
import { TransactionSource, RawCsvRow } from '../types';
import { logger } from '../utils/logger';

export interface IngestionResult {
  source: TransactionSource;
  totalParsed: number;
  inserted: number;
  skipped: number;
  rejected: number;
  rejectionReasons: string[];
}

export class IngestionService {
  private rawRepo = new RawTransactionRepository();
  private normalizedRepo = new NormalizedTransactionRepository();
  private rejectedRepo = new RejectedRowRepository();

  /**
   * Ingests a CSV file: parse → validate → normalize → store.
   * Bad rows are stored in the rejected_rows collection with reasons.
   */
  async ingestFile(filePath: string, source: TransactionSource): Promise<IngestionResult> {
    logger.info({ source, filePath }, 'Starting CSV ingestion');

    const { rows } = await parseCsvFile(filePath, source);

    const validRawDocs: Array<{
      transactionId: string;
      source: TransactionSource;
      rawData: RawCsvRow;
      ingestedAt: Date;
      normalizedId: null;
    }> = [];

    const normalizedDocs: Array<{
      transactionId: string;
      source: TransactionSource;
      timestamp: Date;
      type: ReturnType<typeof normalizeType>;
      asset: ReturnType<typeof normalizeAsset>;
      rawAsset: string;
      rawType: string;
      quantity: number;
      priceUsd: number | null;
      fee: number;
      note: string;
      rawTransactionId: null; // Will be linked after raw insert
    }> = [];

    const rejectedDocs: Array<{
      source: TransactionSource;
      rawRow: RawCsvRow;
      reason: string;
      rowIndex: number;
      ingestedAt: Date;
    }> = [];

    const seenIds = new Set<string>();
    const rejectionReasons: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // +2 for 1-based index + header row

      // Detect in-file duplicates
      const txId = row.transaction_id?.trim() ?? '';
      if (txId && seenIds.has(txId)) {
        const reason = `Row ${rowIndex}: Duplicate transaction_id '${txId}' within file`;
        rejectedDocs.push({ source, rawRow: row, reason, rowIndex, ingestedAt: new Date() });
        rejectionReasons.push(reason);
        logger.warn({ txId, rowIndex, source }, 'Duplicate row detected');
        continue;
      }
      if (txId) seenIds.add(txId);

      // Validate
      const validation = validateRawRow(row, rowIndex);
      if (!validation.valid) {
        const reason = validation.errors.join('; ');
        rejectedDocs.push({ source, rawRow: row, reason, rowIndex, ingestedAt: new Date() });
        rejectionReasons.push(reason);
        logger.warn({ txId, rowIndex, source, errors: validation.errors }, 'Row validation failed');
        continue;
      }

      // Normalize
      const timestamp = parseTimestamp(row.timestamp)!;
      const asset = normalizeAsset(row.asset!);
      const type = normalizeType(row.type!);
      const quantity = parseNumber(row.quantity)!;
      const priceUsd = parseNumber(row.price_usd ?? undefined);
      const fee = parseNumber(row.fee ?? undefined) ?? 0;

      validRawDocs.push({
        transactionId: txId,
        source,
        rawData: row,
        ingestedAt: new Date(),
        normalizedId: null,
      });

      normalizedDocs.push({
        transactionId: txId,
        source,
        timestamp,
        type,
        asset,
        rawAsset: row.asset!.trim(),
        rawType: row.type!.trim(),
        quantity,
        priceUsd,
        fee,
        note: row.note?.trim() ?? '',
        rawTransactionId: null,
      });
    }

    // Batch persist
    const [rawResult, normalizedResult] = await Promise.all([
      this.rawRepo.bulkUpsert(validRawDocs as Parameters<typeof this.rawRepo.bulkUpsert>[0]),
      this.normalizedRepo.bulkUpsert(
        normalizedDocs as unknown as Parameters<typeof this.normalizedRepo.bulkUpsert>[0],
      ),
    ]);

    if (rejectedDocs.length > 0) {
      await this.rejectedRepo.bulkInsert(rejectedDocs);
    }

    const result: IngestionResult = {
      source,
      totalParsed: rows.length,
      inserted: rawResult.inserted,
      skipped: rawResult.skipped,
      rejected: rejectedDocs.length,
      rejectionReasons,
    };

    logger.info(result, 'Ingestion complete');
    return result;
  }

  /**
   * Ingests both CSV files in parallel.
   */
  async ingestBoth(
    userCsvPath: string,
    exchangeCsvPath: string,
  ): Promise<{ user: IngestionResult; exchange: IngestionResult }> {
    const [user, exchange] = await Promise.all([
      this.ingestFile(userCsvPath, TransactionSource.USER),
      this.ingestFile(exchangeCsvPath, TransactionSource.EXCHANGE),
    ]);
    return { user, exchange };
  }
}
