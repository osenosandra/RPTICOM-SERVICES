const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Stringify transaction objects and metadata maps neatly next to the timestamp
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  format: logFormat,
  transports: [
    // Console transport for real-time tracking in all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport active during production environment execution
    ...(config.server?.env === 'production' ? [
      new winston.transports.File({
        filename: config.logging?.filePath || path.join(__dirname, '../logs/app.log'),
        maxsize: 5242880, // 5MB before auto-rotating
        maxFiles: 5,
      })
    ] : [])
  ],
});

module.exports = logger;
