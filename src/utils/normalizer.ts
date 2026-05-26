import { NormalizedAsset, NormalizedTransactionType } from '../types';
import { ASSET_NORMALIZATION_MAP, TYPE_NORMALIZATION_MAP } from '../config/normalization';

/**
 * Normalizes a raw asset string to a canonical NormalizedAsset enum value.
 * Returns UNKNOWN if no mapping is found.
 */
export function normalizeAsset(raw: string): NormalizedAsset {
  if (!raw || typeof raw !== 'string') return NormalizedAsset.UNKNOWN;
  const key = raw.trim().toLowerCase();
  return ASSET_NORMALIZATION_MAP[key] ?? NormalizedAsset.UNKNOWN;
}

/**
 * Normalizes a raw transaction type string to a canonical NormalizedTransactionType.
 * Returns UNKNOWN if no mapping is found.
 */
export function normalizeType(raw: string): NormalizedTransactionType {
  if (!raw || typeof raw !== 'string') return NormalizedTransactionType.UNKNOWN;
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return TYPE_NORMALIZATION_MAP[key] ?? NormalizedTransactionType.UNKNOWN;
}

/**
 * Parses a timestamp string into a Date object.
 * Returns null if the timestamp is missing or malformed.
 */
export function parseTimestamp(raw: string | undefined): Date | null {
  if (!raw || raw.trim() === '') return null;

  const trimmed = raw.trim();

  // ISO 8601 with Z suffix
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try appending Z if missing
  const withZ = new Date(trimmed + 'Z');
  if (!isNaN(withZ.getTime())) return withZ;

  return null;
}

/**
 * Parses a numeric string to a float.
 * Returns null if the value is missing or not a valid number.
 */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw.trim() === '') return null;
  const trimmed = raw.trim();
  // Reject strings that aren't valid numeric representations
  // (e.g. "1.2.3" — parseFloat would return 1.2, which is misleading)
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Calculates the absolute percentage difference between two numbers.
 * Returns Infinity if the reference value is 0.
 */
export function quantityDeltaPct(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : Infinity;
  return Math.abs((a - b) / b) * 100;
}

/**
 * Calculates the absolute time difference in seconds between two dates.
 */
export function timeDeltaSeconds(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 1000;
}
