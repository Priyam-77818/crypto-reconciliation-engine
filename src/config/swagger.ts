import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Crypto Transaction Reconciliation Engine',
      version: '1.0.0',
      description: `
## Overview
A production-grade API for reconciling crypto transactions between user records and exchange records.

## Workflow
1. **POST /ingest** — Load CSV files into MongoDB
2. **POST /reconcile** — Run the reconciliation engine
3. **GET /report/:runId** — Retrieve full results
4. **GET /report/:runId/summary** — Get summary statistics
5. **GET /report/:runId/unmatched** — View unmatched transactions

## Reconciliation Statuses
- **MATCHED** — Transaction found in both sources within tolerance
- **CONFLICTING** — Candidate found but exceeds tolerance windows
- **UNMATCHED_USER** — Transaction only in user CSV
- **UNMATCHED_EXCHANGE** — Transaction only in exchange CSV
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'System', description: 'Health and system endpoints' },
      { name: 'Ingestion', description: 'CSV ingestion endpoints' },
      { name: 'Reconciliation', description: 'Reconciliation run management' },
      { name: 'Reports', description: 'Report retrieval endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
