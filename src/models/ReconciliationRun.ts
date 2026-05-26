import mongoose, { Document, Schema } from 'mongoose';
import { RunStatus, ReconciliationConfig } from '../types';

export interface IReconciliationRun extends Document {
  runId: string;
  status: RunStatus;
  config: ReconciliationConfig;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  totalUser: number;
  totalExchange: number;
  matched: number;
  conflicting: number;
  unmatchedUser: number;
  unmatchedExchange: number;
  rejectedUser: number;
  rejectedExchange: number;
  matchRate: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationRunSchema = new Schema<IReconciliationRun>(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RunStatus),
      required: true,
      default: RunStatus.PENDING,
      index: true,
    },
    config: {
      timestampToleranceSeconds: { type: Number, required: true },
      quantityTolerancePct: { type: Number, required: true },
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    totalUser: { type: Number, default: 0 },
    totalExchange: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    conflicting: { type: Number, default: 0 },
    unmatchedUser: { type: Number, default: 0 },
    unmatchedExchange: { type: Number, default: 0 },
    rejectedUser: { type: Number, default: 0 },
    rejectedExchange: { type: Number, default: 0 },
    matchRate: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'reconciliationruns',
  },
);

export const ReconciliationRun = mongoose.model<IReconciliationRun>(
  'ReconciliationRun',
  ReconciliationRunSchema,
);
