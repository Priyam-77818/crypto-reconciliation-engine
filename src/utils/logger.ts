import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logging.level,
  transport:
    config.app.isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: config.app.name,
    env: config.app.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
