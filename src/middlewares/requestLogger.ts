import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs incoming requests and their response times.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
      `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`,
    );
  });

  next();
}
