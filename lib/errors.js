'use strict';

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details = {}) {
    super(message, 401, 'AUTH_REQUIRED', details);
  }
}

/**
 * Authorization error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden', details = {}) {
    super(message, 403, 'ACCESS_FORBIDDEN', details);
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = {}) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

/**
 * Conflict error (409)
 */
class ConflictError extends AppError {
  constructor(message, details = {}) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate limit error (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = {}) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Database error (500)
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    const details = originalError ? { originalError: originalError.message } : {};
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * External service error (502)
 */
class ExternalServiceError extends AppError {
  constructor(service, originalError = null) {
    const message = `External service error: ${service}`;
    const details = originalError ? { originalError: originalError.message } : {};
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * SSRF protection error (403)
 */
class SSRFError extends AppError {
  constructor(message = 'Request blocked by SSRF protection', details = {}) {
    super(message, 403, 'SSRF_BLOCKED', details);
  }
}

/**
 * File upload error (400)
 */
class UploadError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'UPLOAD_ERROR', details);
  }
}

/**
 * Check if error is operational (expected) or programming error
 * @param {Error} error
 * @returns {boolean}
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Express error handler middleware
 * @param {Error} err
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
function errorHandler(err, req, res, next) {
  const logger = require('./logger').getLogger();

  // Log error
  if (isOperationalError(err)) {
    logger.warn('Operational error', {
      requestId: req.id,
      error: err.message,
      code: err.code,
      url: req.url,
      method: req.method
    });
  } else {
    logger.error('Unexpected error', {
      requestId: req.id,
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  // Don't expose internal errors to client in production
  if (!isOperationalError(err) && process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.id
    });
  }

  // Send error response
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message,
    code: err.code || 'INTERNAL_ERROR'
  };

  // Include details in development
  if (process.env.NODE_ENV !== 'production' && err.details) {
    response.details = err.details;
  }

  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  SSRFError,
  UploadError,
  isOperationalError,
  errorHandler
};
