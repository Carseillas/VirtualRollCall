// backend/middleware/errorHandler.js - Error Handling Middleware

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Log error function
const logError = (error, req = null) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    }
  };

  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 ERROR:', JSON.stringify(errorLog, null, 2));
  } else {
    console.error('ERROR:', JSON.stringify(errorLog));
    // In production, you might want to send this to a logging service
    // like Winston, Sentry, or CloudWatch
  }
};

// Send error response
const sendErrorResponse = (res, error, req = null) => {
  // Log the error
  logError(error, req);

  // Default error response
  let errorResponse = {
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req ? req.originalUrl : undefined
  };

  // Add details for validation errors
  if (error instanceof ValidationError && error.details) {
    errorResponse.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.statusCode = error.statusCode;
  }

  // Add request ID if available
  if (req && req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  // If response was already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    const validationError = new ValidationError(
      'Validation failed',
      Object.keys(error.errors).map(field => ({
        field,
        message: error.errors[field].message
      }))
    );
    return sendErrorResponse(res, validationError, req);
  }

  if (error.name === 'CastError') {
    const castError = new ValidationError(`Invalid ${error.path}: ${error.value}`);
    return sendErrorResponse(res, castError, req);
  }

  if (error.name === 'JsonWebTokenError') {
    const jwtError = new AuthenticationError('Invalid token');
    return sendErrorResponse(res, jwtError, req);
  }

  if (error.name === 'TokenExpiredError') {
    const expiredError = new AuthenticationError('Token expired');
    return sendErrorResponse(res, expiredError, req);
  }

  if (error.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(error.keyValue)[0];
    const duplicateError = new ConflictError(`${field} already exists`);
    return sendErrorResponse(res, duplicateError, req);
  }

  // Handle operational errors
  if (error.isOperational) {
    return sendErrorResponse(res, error, req);
  }

  // Handle unknown errors
  const unknownError = new AppError(
    process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    500,
    'INTERNAL_ERROR'
  );
  
  sendErrorResponse(res, unknownError, req);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Validation middleware creator
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property]);
    
    if (error) {
      const validationError = new ValidationError(
        'Request validation failed',
        error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }))
      );
      return next(validationError);
    }
    
    req[property] = value;
    next();
  };
};

// Request timeout handler
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      const timeoutError = new AppError('Request timeout', 408, 'REQUEST_TIMEOUT');
      next(timeoutError);
    });
    next();
  };
};

// Database operation wrapper
const dbOperation = async (operation, errorMessage = 'Database operation failed') => {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation error:', error);
    throw new DatabaseError(errorMessage);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  logError(new Error(`Unhandled Promise Rejection: ${reason}`));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  logError(error);
  process.exit(1);
});

// Error response helper functions
const createSuccessResponse = (data, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
};

const createErrorResponse = (message, code = 'ERROR', details = null) => {
  const response = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return response;
};

// Pagination helper with error handling
const paginateResults = (results, page = 1, limit = 10) => {
  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1) {
      throw new ValidationError('Page and limit must be positive numbers');
    }
    
    if (limitNum > 100) {
      throw new ValidationError('Limit cannot exceed 100 items per page');
    }

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedResults = results.slice(startIndex, endIndex);
    
    return {
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: results.length,
        pages: Math.ceil(results.length / limitNum),
        hasNext: endIndex < results.length,
        hasPrev: pageNum > 1
      }
    };
  } catch (error) {
    throw new ValidationError('Invalid pagination parameters');
  }
};

// Rate limit error handler
const rateLimitHandler = (req, res, next) => {
  const error = new AppError(
    'Too many requests from this IP, please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );
  sendErrorResponse(res, error, req);
};

// CORS error handler
const corsErrorHandler = (req, res, next) => {
  const error = new AppError(
    'CORS policy violation',
    403,
    'CORS_ERROR'
  );
  sendErrorResponse(res, error, req);
};

// File upload error handler
const uploadErrorHandler = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    const sizeError = new ValidationError('File too large');
    return sendErrorResponse(res, sizeError, req);
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    const countError = new ValidationError('Too many files');
    return sendErrorResponse(res, countError, req);
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const typeError = new ValidationError('Unexpected file field');
    return sendErrorResponse(res, typeError, req);
  }
  
  next(error);
};

// Health check error handler
const healthCheckErrorHandler = (req, res, next) => {
  try {
    // Perform basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    };
    
    res.json({
      status: 'healthy',
      checks
    });
  } catch (error) {
    const healthError = new AppError('Health check failed', 503, 'HEALTH_CHECK_ERROR');
    sendErrorResponse(res, healthError, req);
  }
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  
  // Middleware functions
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validateRequest,
  timeoutHandler,
  rateLimitHandler,
  corsErrorHandler,
  uploadErrorHandler,
  healthCheckErrorHandler,
  
  // Utility functions
  logError,
  sendErrorResponse,
  dbOperation,
  createSuccessResponse,
  createErrorResponse,
  paginateResults
};