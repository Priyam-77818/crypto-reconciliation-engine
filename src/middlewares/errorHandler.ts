import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

/**
 * Centralized error handling middleware.
 * Converts known AppErrors to structured JSON responses.
 * Logs unexpected errors with full stack traces.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err instanceof ValidationError && err.details) {
      response.error.details = err.details;
    }

    if (process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }

    logger.warn(
      { code: err.code, statusCode: err.statusCode, path: req.path, method: req.method },
      err.message,
    );

    res.status(err.statusCode).json(response);
    return;
  }

  // Unexpected error
  logger.error(
    { err, path: req.path, method: req.method },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
