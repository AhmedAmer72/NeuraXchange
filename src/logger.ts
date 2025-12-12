// Structured logging with Winston
import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let meta = '';
  if (Object.keys(metadata).length > 0) {
    meta = ` ${JSON.stringify(metadata)}`;
  }
  return `${timestamp} [${level}]: ${message}${meta}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'neuraxchange-bot' },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      )
    }),
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: path.join(process.cwd(), 'logs', 'error.log'), 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Convenience methods for specific log types
export const log = {
  // Bot events
  botStart: () => logger.info('🚀 Bot starting...'),
  botReady: (username: string) => logger.info(`✅ Bot ready: @${username}`),
  botShutdown: (signal: string) => logger.info(`📴 Shutdown initiated: ${signal}`),
  
  // User actions
  userCommand: (chatId: number, command: string) => 
    logger.info(`Command received`, { chatId, command }),
  userMessage: (chatId: number, intent: string) => 
    logger.debug(`Message processed`, { chatId, intent }),
  
  // Swap events
  swapStarted: (chatId: number, from: string, to: string, amount: string) =>
    logger.info(`Swap initiated`, { chatId, from, to, amount }),
  swapCreated: (chatId: number, shiftId: string) =>
    logger.info(`Shift created`, { chatId, shiftId }),
  swapStatusUpdate: (shiftId: string, status: string) =>
    logger.info(`Shift status update`, { shiftId, status }),
  swapCompleted: (shiftId: string, settleAmount: string) =>
    logger.info(`Shift completed`, { shiftId, settleAmount }),
  swapFailed: (shiftId: string, error: string) =>
    logger.warn(`Shift failed`, { shiftId, error }),
  
  // API events
  apiRequest: (method: string, endpoint: string) =>
    logger.debug(`API request`, { method, endpoint }),
  apiResponse: (endpoint: string, status: number) =>
    logger.debug(`API response`, { endpoint, status }),
  apiError: (endpoint: string, error: string, status?: number) =>
    logger.error(`API error`, { endpoint, error, status }),
  
  // Alert events
  alertCreated: (chatId: number, pair: string, direction: string, rate: number) =>
    logger.info(`Alert created`, { chatId, pair, direction, rate }),
  alertTriggered: (chatId: number, pair: string, currentRate: number) =>
    logger.info(`Alert triggered`, { chatId, pair, currentRate }),
  
  // Error logging
  error: (message: string, error?: Error | any, metadata?: object) =>
    logger.error(message, { 
      error: error?.message || error, 
      stack: error?.stack,
      ...metadata 
    }),
  
  // Performance metrics
  metric: (name: string, value: number, unit: string) =>
    logger.info(`Metric: ${name}`, { value, unit }),
  
  // Database events
  dbQuery: (operation: string, model: string) =>
    logger.debug(`DB operation`, { operation, model }),
  dbError: (operation: string, error: string) =>
    logger.error(`DB error`, { operation, error }),
};

export default logger;
