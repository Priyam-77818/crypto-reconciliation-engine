import { Router } from 'express';
import {
  triggerReconciliation,
  getFullReport,
  getReportSummary,
  getUnmatched,
  listRuns,
} from '../controllers/reconciliation.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /reconcile:
 *   post:
 *     summary: Trigger a new reconciliation run
 *     tags: [Reconciliation]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timestampToleranceSeconds:
 *                 type: number
 *                 description: Override timestamp tolerance in seconds
 *                 example: 300
 *               quantityTolerancePct:
 *                 type: number
 *                 description: Override quantity tolerance percentage
 *                 example: 0.01
 *     responses:
 *       202:
 *         description: Reconciliation run completed
 *       400:
 *         description: Invalid configuration
 */
router.post('/reconcile', asyncHandler(triggerReconciliation));

/**
 * @swagger
 * /runs:
 *   get:
 *     summary: List all reconciliation runs
 *     tags: [Reconciliation]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of runs
 */
router.get('/runs', asyncHandler(listRuns));

/**
 * @swagger
 * /report/{runId}:
 *   get:
 *     summary: Get full reconciliation report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Full report
 *       404:
 *         description: Run not found
 */
router.get('/report/:runId', asyncHandler(getFullReport));

/**
 * @swagger
 * /report/{runId}/summary:
 *   get:
 *     summary: Get reconciliation run summary
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Summary statistics
 *       404:
 *         description: Run not found
 */
router.get('/report/:runId/summary', asyncHandler(getReportSummary));

/**
 * @swagger
 * /report/{runId}/unmatched:
 *   get:
 *     summary: Get unmatched transactions for a run
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Unmatched transactions
 *       404:
 *         description: Run not found
 */
router.get('/report/:runId/unmatched', asyncHandler(getUnmatched));

export default router;
