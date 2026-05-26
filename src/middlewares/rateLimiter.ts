import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Stricter limiter for reconciliation trigger endpoint.
 */
export const reconcileLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Reconciliation rate limit exceeded. Max 10 runs per minute.',
    },
  },
});
