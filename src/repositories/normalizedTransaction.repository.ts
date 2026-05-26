import { NormalizedTransaction, INormalizedTransaction } from '../models/NormalizedTransaction';
import { TransactionSource, NormalizedAsset, NormalizedTransactionType } from '../types';
import mongoose from 'mongoose';
export class NormalizedTransactionRepository {
  async bulkUpsert(
    docs: Array<Omit<INormalizedTransaction, keyof mongoose.Document>>,
  ): Promise<{ inserted: number; skipped: number }> {
    if (docs.length === 0) return { inserted: 0, skipped: 0 };

    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { transactionId: doc.transactionId, source: doc.source },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    const result = await NormalizedTransaction.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount;
    const skipped = docs.length - inserted;
    return { inserted, skipped };
  }

  async findBySource(source: TransactionSource): Promise<INormalizedTransaction[]> {
    return NormalizedTransaction.find({ source }).lean().exec() as unknown as INormalizedTransaction[];
  }

  async findByAssetAndType(
    asset: NormalizedAsset,
    type: NormalizedTransactionType,
    source: TransactionSource,
  ): Promise<INormalizedTransaction[]> {
    return NormalizedTransaction.find({ asset, type, source }).sort({ timestamp: 1 }).lean().exec() as unknown as INormalizedTransaction[];
  }

  async countBySource(source: TransactionSource): Promise<number> {
    return NormalizedTransaction.countDocuments({ source });
  }

  async deleteAll(): Promise<void> {
    await NormalizedTransaction.deleteMany({});
  }
}
