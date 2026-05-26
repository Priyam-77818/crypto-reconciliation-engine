import mongoose, { Document, Schema } from 'mongoose';
import { TransactionSource, NormalizedAsset, NormalizedTransactionType } from '../types';

export interface INormalizedTransaction extends Document {
  transactionId: string;
  source: TransactionSource;
  timestamp: Date;
  type: NormalizedTransactionType;
  asset: NormalizedAsset;
  rawAsset: string;
  rawType: string;
  quantity: number;
  priceUsd: number | null;
  fee: number;
  note: string;
  rawTransactionId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NormalizedTransactionSchema = new Schema<INormalizedTransaction>(
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
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NormalizedTransactionType),
      required: true,
      index: true,
    },
    asset: {
      type: String,
      enum: Object.values(NormalizedAsset),
      required: true,
      index: true,
    },
    rawAsset: {
      type: String,
      required: true,
    },
    rawType: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity must be non-negative'],
    },
    priceUsd: {
      type: Number,
      default: null,
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Fee must be non-negative'],
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    rawTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'RawTransaction',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'normalizedtransactions',
  },
);

// Compound index for reconciliation grouping
NormalizedTransactionSchema.index({ asset: 1, type: 1, timestamp: 1 });
NormalizedTransactionSchema.index({ source: 1, transactionId: 1 }, { unique: true });

export const NormalizedTransaction = mongoose.model<INormalizedTransaction>(
  'NormalizedTransaction',
  NormalizedTransactionSchema,
);
