import { Router, Request, Response } from 'express';
import path from 'path';
import { RejectedRow } from '../models/RejectedRow';
import { TransactionSource } from '../types';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/rejected
 * Returns rejected rows for a given source (user | exchange).
 * Used by the dashboard UI.
 */
router.get(
  '/api/rejected',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const source = (req.query.source as string) === 'exchange'
      ? TransactionSource.EXCHANGE
      : TransactionSource.USER;

    const rows = await RejectedRow.find({ source })
      .sort({ rowIndex: 1 })
      .limit(200)
      .lean();

    res.json({ success: true, data: rows });
  }),
);

export default router;
