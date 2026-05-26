import mongoose, { Document, Schema } from 'mongoose';
import { ReconciliationStatus, ConflictReason } from '../types';

export interface IReconciliationResult extends Document {
  runId: string;
  status: ReconciliationStatus;
  userTransactionId: string | null;
  exchangeTransactionId: string | null;
  asset: string;
  type: string;
  userTimestamp: Date | null;
  exchangeTimestamp: Date | null;
  userQuantity: number | null;
  exchangeQuantity: number | null;
  timeDeltaSeconds: number | null;
  quantityDeltaPct: number | null;
  confidenceScore: number | null;
  matchMethod: string | null;
  conflictReasons: ConflictReason[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationResultSchema = new Schema<IReconciliationResult>(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReconciliationStatus),
      required: true,
      index: true,
    },
    userTransactionId: {
      type: String,
      default: null,
      index: true,
    },
    exchangeTransactionId: {
      type: String,
      default: null,
      index: true,
    },
    asset: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    userTimestamp: { type: Date, default: null },
    exchangeTimestamp: { type: Date, default: null },
    userQuantity: { type: Number, default: null },
    exchangeQuantity: { type: Number, default: null },
    timeDeltaSeconds: { type: Number, default: null },
    quantityDeltaPct: { type: Number, default: null },
    confidenceScore: { type: Number, default: null },
    matchMethod: { type: String, default: null },
    conflictReasons: {
      type: [String],
      enum: Object.values(ConflictReason),
      default: [],
    },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'reconciliationresults',
  },
);

// Compound index for efficient report queries
ReconciliationResultSchema.index({ runId: 1, status: 1 });
ReconciliationResultSchema.index({ runId: 1, asset: 1 });

export const ReconciliationResult = mongoose.model<IReconciliationResult>(
  'ReconciliationResult',
  ReconciliationResultSchema,
);
