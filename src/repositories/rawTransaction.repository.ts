import { RawTransaction, IRawTransaction } from '../models/RawTransaction';
import { TransactionSource } from '../types';
import mongoose, { FlattenMaps } from 'mongoose';

// Mongoose .lean() returns FlattenMaps<T>; we cast to T for internal use
type LeanDoc<T> = FlattenMaps<T> & { _id: mongoose.Types.ObjectId };

export class RawTransactionRepository {
  /**
   * Bulk insert raw transactions, skipping duplicates (upsert by transactionId + source).
   * Returns the count of inserted documents.
   */
  async bulkUpsert(
    docs: Array<Omit<IRawTransaction, keyof mongoose.Document>>,
  ): Promise<{ inserted: number; skipped: number }> {
    if (docs.length === 0) return { inserted: 0, skipped: 0 };

    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { transactionId: doc.transactionId, source: doc.source },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    const result = await RawTransaction.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount;
    const skipped = docs.length - inserted;
    return { inserted, skipped };
  }

  async findBySource(source: TransactionSource): Promise<IRawTransaction[]> {
    return RawTransaction.find({ source }).lean().exec() as unknown as IRawTransaction[];
  }

  async countBySource(source: TransactionSource): Promise<number> {
    return RawTransaction.countDocuments({ source });
  }

  async deleteAll(): Promise<void> {
    await RawTransaction.deleteMany({});
  }
}
