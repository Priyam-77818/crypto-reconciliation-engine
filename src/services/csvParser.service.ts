import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { RawCsvRow, TransactionSource } from '../types';
import { logger } from '../utils/logger';

export interface CsvParseResult {
  rows: RawCsvRow[];
  totalRows: number;
  source: TransactionSource;
  filePath: string;
}

/**
 * Streams and parses a CSV file into raw row objects.
 * Uses csv-parse in streaming mode to handle large files efficiently.
 */
export async function parseCsvFile(
  filePath: string,
  source: TransactionSource,
): Promise<CsvParseResult> {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  return new Promise((resolve, reject) => {
    const rows: RawCsvRow[] = [];

    const parser = parse({
      columns: true,           // Use first row as column headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Don't fail on rows with extra/missing columns
      bom: true,               // Handle BOM characters
    });

    const stream = fs.createReadStream(resolvedPath);

    stream.on('error', (err) => {
      reject(new Error(`Failed to read CSV file '${resolvedPath}': ${err.message}`));
    });

    parser.on('readable', () => {
      let record: RawCsvRow;
      while ((record = parser.read() as RawCsvRow) !== null) {
        rows.push(record);
      }
    });

    parser.on('error', (err) => {
      reject(new Error(`CSV parse error in '${resolvedPath}': ${err.message}`));
    });

    parser.on('end', () => {
      logger.info(
        { source, filePath: resolvedPath, totalRows: rows.length },
        'CSV file parsed successfully',
      );
      resolve({
        rows,
        totalRows: rows.length,
        source,
        filePath: resolvedPath,
      });
    });

    stream.pipe(parser);
  });
}
