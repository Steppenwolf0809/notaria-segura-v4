import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import config from './config.js';

const logsDir = resolve(config.ROOT_DIR, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const logger = createLogger({
  level: config.LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      const msg = stack || message;
      return `${timestamp} [${level.toUpperCase()}] ${msg}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(({ timestamp, level, message, stack }) => {
          const msg = stack || message;
          return `${timestamp} ${level} ${msg}`;
        })
      ),
    }),
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'sync-agent-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '10m',
    }),
  ],
});

export default logger;
