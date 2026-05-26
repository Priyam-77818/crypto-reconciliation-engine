import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Establishes a MongoDB connection with retry logic.
 * Retries up to MAX_RETRIES times with exponential backoff.
 * Critical for Atlas cold starts on Render free tier.
 */
export async function connectDatabase(): Promise<void> {
  const { uri, options } = config.mongodb;

  mongoose.connection.on('connected', () => {
    logger.info({ uri: uri.replace(/\/\/.*@/, '//***@') }, 'MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ attempt, maxRetries: MAX_RETRIES }, 'Connecting to MongoDB...');
      await mongoose.connect(uri, options);
      logger.info('MongoDB connection established');
      return;
    } catch (err) {
      const isLastAttempt = attempt === MAX_RETRIES;
      logger.error(
        { attempt, maxRetries: MAX_RETRIES, err },
        `MongoDB connection attempt ${attempt} failed`,
      );
      if (isLastAttempt) {
        throw new Error(
          `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const delay = RETRY_DELAY_MS * attempt;
      logger.info({ delayMs: delay }, `Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Gracefully closes the MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
