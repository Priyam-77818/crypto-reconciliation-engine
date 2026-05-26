export enum TransactionSource {
  USER = 'user',
  EXCHANGE = 'exchange',
}

export enum NormalizedAsset {
  BTC = 'BTC',
  ETH = 'ETH',
  SOL = 'SOL',
  USDT = 'USDT',
  MATIC = 'MATIC',
  LINK = 'LINK',
  UNKNOWN = 'UNKNOWN',
}

export enum NormalizedTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  UNKNOWN = 'UNKNOWN',
}

export enum ReconciliationStatus {
  MATCHED = 'MATCHED',
  CONFLICTING = 'CONFLICTING',
  UNMATCHED_USER = 'UNMATCHED_USER',
  UNMATCHED_EXCHANGE = 'UNMATCHED_EXCHANGE',
}

export enum ConflictReason {
  TIMESTAMP_OUT_OF_RANGE = 'timestamp_out_of_range',
  QUANTITY_MISMATCH = 'quantity_mismatch',
  ASSET_MISMATCH = 'asset_mismatch',
  TYPE_MISMATCH = 'type_mismatch',
  DUPLICATE_CANDIDATE = 'duplicate_candidate',
  MISSING_TRANSACTION = 'missing_transaction',
  FEE_MISMATCH = 'fee_mismatch',
}

export enum RunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ReconciliationConfig {
  timestampToleranceSeconds: number;
  quantityTolerancePct: number;
}

export interface RawCsvRow {
  transaction_id?: string;
  timestamp?: string;
  type?: string;
  asset?: string;
  quantity?: string;
  price_usd?: string;
  fee?: string;
  note?: string;
  [key: string]: string | undefined;
}

export interface ParsedTransaction {
  transactionId: string;
  timestamp: Date;
  type: NormalizedTransactionType;
  asset: NormalizedAsset;
  quantity: number;
  priceUsd: number | null;
  fee: number;
  note: string;
  source: TransactionSource;
  rawAsset: string;
  rawType: string;
}

export interface ReconciliationSummary {
  runId: string;
  totalUser: number;
  totalExchange: number;
  matched: number;
  conflicting: number;
  unmatchedUser: number;
  unmatchedExchange: number;
  rejectedUser: number;
  rejectedExchange: number;
  matchRate: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  config: ReconciliationConfig;
}

export interface MatchCandidate {
  exchangeTxId: string;
  confidenceScore: number;
  matchMethod: 'exact_id' | 'exact_fields' | 'tolerance' | 'fuzzy_timestamp';
  timeDeltaSeconds: number;
  quantityDeltaPct: number;
  conflicts: ConflictReason[];
}
