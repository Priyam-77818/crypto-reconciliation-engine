import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

/**
 * Establishes a MongoDB connection with retry logic.
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

  await mongoose.connect(uri, options);
}

/**
 * Gracefully closes the MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
