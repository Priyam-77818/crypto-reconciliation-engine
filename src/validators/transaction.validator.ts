import { z } from 'zod';
import { RawCsvRow } from '../types';
import { parseTimestamp, parseNumber } from '../utils/normalizer';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a raw CSV row before normalization.
 * Returns a list of validation errors (empty = valid).
 */
export function validateRawRow(row: RawCsvRow, rowIndex: number): ValidationResult {
  const errors: string[] = [];

  // transaction_id is required
  if (!row.transaction_id || row.transaction_id.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing transaction_id`);
  }

  // timestamp must be present and parseable
  if (!row.timestamp || row.timestamp.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing timestamp`);
  } else {
    const parsed = parseTimestamp(row.timestamp);
    if (!parsed) {
      errors.push(`Row ${rowIndex}: Malformed timestamp '${row.timestamp}'`);
    }
  }

  // type is required
  if (!row.type || row.type.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing transaction type`);
  }

  // asset is required
  if (!row.asset || row.asset.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing asset`);
  }

  // quantity must be present and positive
  if (row.quantity === undefined || row.quantity.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing quantity`);
  } else {
    const qty = parseNumber(row.quantity);
    if (qty === null) {
      errors.push(`Row ${rowIndex}: Invalid quantity '${row.quantity}'`);
    } else if (qty < 0) {
      errors.push(`Row ${rowIndex}: Negative quantity '${row.quantity}' is not allowed`);
    }
  }

  // fee must be non-negative if present
  if (row.fee !== undefined && row.fee.trim() !== '') {
    const fee = parseNumber(row.fee);
    if (fee === null) {
      errors.push(`Row ${rowIndex}: Invalid fee '${row.fee}'`);
    } else if (fee < 0) {
      errors.push(`Row ${rowIndex}: Negative fee '${row.fee}' is not allowed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Zod schema for reconciliation config override in API requests
export const ReconciliationConfigSchema = z.object({
  timestampToleranceSeconds: z
    .number()
    .positive('Timestamp tolerance must be positive')
    .optional(),
  quantityTolerancePct: z
    .number()
    .min(0, 'Quantity tolerance must be >= 0')
    .max(100, 'Quantity tolerance must be <= 100')
    .optional(),
});

export type ReconciliationConfigInput = z.infer<typeof ReconciliationConfigSchema>;
