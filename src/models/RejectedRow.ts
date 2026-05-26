import mongoose, { Document, Schema } from 'mongoose';
import { TransactionSource } from '../types';

export interface IRejectedRow extends Document {
  source: TransactionSource;
  rawRow: Record<string, string | undefined>;
  reason: string;
  rowIndex: number;
  ingestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RejectedRowSchema = new Schema<IRejectedRow>(
  {
    source: {
      type: String,
      enum: Object.values(TransactionSource),
      required: true,
      index: true,
    },
    rawRow: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'rejectedrows',
  },
);

export const RejectedRow = mongoose.model<IRejectedRow>('RejectedRow', RejectedRowSchema);
