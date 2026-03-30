'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const constants = require('../config/constants');

let logger = null;
let dataDir = null;

/**
 * Initialize Winston logger
 * @param {string} logsDir - Directory for log files
 */
function initLogger(logsDir) {
  dataDir = logsDir;

  // Ensure logs directory exists
  const logsPath = path.join(logsDir, 'logs');
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Create transports
  const transports = [
    // Error log
    new winston.transports.File({
      filename: path.join(logsPath, 'error.log'),
      level: 'error',
      maxsize: constants.LOGGING.MAX_FILE_SIZE,
      maxFiles: constants.LOGGING.MAX_FILES,
      tailable: true
    }),
    // Combined log
    new winston.transports.File({
      filename: path.join(logsPath, 'combined.log'),
      maxsize: constants.LOGGING.MAX_FILE_SIZE,
      maxFiles: constants.LOGGING.MAX_FILES,
      tailable: true
    })
  ];

  // Console output in development
  if (constants.SERVER.ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaStr = '';
            if (Object.keys(meta).length > 0 && meta.stack) {
              metaStr = `\n${meta.stack}`;
            } else if (Object.keys(meta).length > 0) {
              metaStr = ` ${JSON.stringify(meta)}`;
            }
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        )
      })
    );
  }

  logger = winston.createLogger({
    level: constants.LOGGING.LEVEL,
    format: logFormat,
    defaultMeta: { service: 'auditor-libre' },
    transports
  });

  return logger;
}

/**
 * Get logger instance
 * @returns {winston.Logger}
 */
function getLogger() {
  if (!logger) {
    // Fallback to console if logger not initialized
    return console;
  }
  return logger;
}

/**
 * Create child logger with additional context
 * @param {object} meta - Additional metadata
 * @returns {winston.Logger}
 */
function createChildLogger(meta) {
  const parentLogger = getLogger();
  if (parentLogger === console) return console;
  return parentLogger.child(meta);
}

/**
 * Middleware to add request logging
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const log = getLogger();

  // Log request
  log.info('Request started', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    log.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    return originalSend.apply(res, arguments);
  };

  next();
}

/**
 * Express error logging middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware
 */
function errorLogger(err, req, res, next) {
  const log = getLogger();

  log.error('Request error', {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  next(err);
}

module.exports = {
  initLogger,
  getLogger,
  createChildLogger,
  requestLogger,
  errorLogger
};
