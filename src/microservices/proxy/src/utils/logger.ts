import winston from 'winston';
import { LogLevel } from '../types';

const logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]`;
      
      if (service) logMessage += ` [${service}]`;
      
      logMessage += ` ${message}`;
      
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  ),
  defaultMeta: { 
    service: 'api-gateway',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}


