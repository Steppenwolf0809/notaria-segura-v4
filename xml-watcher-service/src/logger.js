import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

function ensureDirSync(dirPath) {
  try {
    fs.ensureDirSync(dirPath);
  } catch (err) {
    // silent
  }
}

export function createLogger(logDir, level = 'info') {
  ensureDirSync(logDir);
  const fileTransport = new winston.transports.DailyRotateFile({
    dirname: logDir,
    filename: 'xml-service-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '10m',
    maxFiles: '30d'
  });

  const consoleTransport = new winston.transports.Console({
    level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    )
  });

  const logger = winston.createLogger({
    level: level.toLowerCase(),
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level.toUpperCase()} ${message}`;
      })
    ),
    transports: [fileTransport, consoleTransport]
  });

  logger.stream = {
    write: (message) => logger.info(message.trim())
  };

  return logger;
}


