import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  app: {
    name: getEnv('APP_NAME', 'crypto-reconciliation-engine'),
    env: getEnv('NODE_ENV', 'development'),
    port: parseInt(getEnv('PORT', '3000'), 10),
    isDev: getEnv('NODE_ENV', 'development') === 'development',
  },
  mongodb: {
    uri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/crypto_reconciliation'),
    dbName: getEnv('MONGODB_DB_NAME', 'crypto_reconciliation'),
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  reconciliation: {
    timestampToleranceSeconds: parseFloat(
      getEnv('TIMESTAMP_TOLERANCE_SECONDS', '300'),
    ),
    quantityTolerancePct: parseFloat(getEnv('QUANTITY_TOLERANCE_PCT', '0.01')),
  },
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
  },
  rateLimit: {
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    maxRequests: parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
  csv: {
    userCsvPath: getEnv('USER_CSV_PATH', './data/user-transactions.csv'),
    exchangeCsvPath: getEnv('EXCHANGE_CSV_PATH', './data/exchange-transactions.csv'),
  },
} as const;

export type AppConfig = typeof config;
