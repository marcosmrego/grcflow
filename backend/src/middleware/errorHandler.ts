import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../models/types';

/**
 * Custom error class for consistent error handling
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(401, 'UNAUTHORIZED', message);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, 'FORBIDDEN', message);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(404, 'NOT_FOUND', message);
  }
}

/**
 * Conflict error (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

/**
 * Internal server error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, 'INTERNAL_ERROR', message, details);
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle validation errors
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }
  // Handle database errors
  else if ((err as any).code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  } else if ((err as any).code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 409;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Cannot perform this operation due to related records';
  } else if ((err as any).code === '42P01') {
    // PostgreSQL table not found
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Database table not found';
  }
  // Generic error
  else {
    console.error('[ERROR]', err);
  }

  // Log error with request context
  const requestId = req.requestId || 'unknown';
  const user = req.user ? `${req.user.email}` : 'anonymous';
  const method = req.method;
  const path = req.path;

  if (statusCode >= 500) {
    console.error(
      `[${requestId}] ERROR [${method} ${path}] (${user}): ${code} - ${message}`
    );
  } else {
    console.warn(
      `[${requestId}] WARN [${method} ${path}] (${user}): ${code} - ${message}`
    );
  }

  // Send response
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
  };

  res.status(statusCode).json(response);
};

/**
 * 404 handler - must be last
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.path} not found`,
    },
  };

  res.status(404).json(response);
};
