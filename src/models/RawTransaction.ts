import mongoose, { Document, Schema } from 'mongoose';
import { TransactionSource } from '../types';

export interface IRawTransaction extends Document {
  transactionId: string;
  source: TransactionSource;
  rawData: Record<string, string | undefined>;
  ingestedAt: Date;
  normalizedId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const RawTransactionSchema = new Schema<IRawTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(TransactionSource),
      required: true,
      index: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    normalizedId: {
      type: Schema.Types.ObjectId,
      ref: 'NormalizedTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'rawtransactions',
  },
);

// Compound index to detect duplicates per source
RawTransactionSchema.index({ transactionId: 1, source: 1 }, { unique: true });

export const RawTransaction = mongoose.model<IRawTransaction>(
  'RawTransaction',
  RawTransactionSchema,
);
