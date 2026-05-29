import { Request, Response, NextFunction } from 'express';

/**
 * Capture request context for audit logging
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      ipAddress?: string;
      userAgent?: string;
    }
  }
}

/**
 * Middleware to capture request metadata for logging
 */
export const auditContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Capture timing
  req.startTime = Date.now();

  // Capture client info
  req.ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  req.userAgent = req.headers['user-agent'] || 'unknown';

  // Log request
  const { method, path } = req;
  const user = req.user ? `${req.user.email} (${req.user.role})` : 'anonymous';

  console.log(`[${req.requestId}] ${method} ${path} - User: ${user}`);

  // Capture response time
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - (req.startTime || Date.now());
    const status = res.statusCode;

    // Log response
    if (status >= 400) {
      console.error(
        `[${req.requestId}] ${status} - ${duration}ms - ${method} ${path} - User: ${user}`
      );
    } else {
      console.log(
        `[${req.requestId}] ${status} - ${duration}ms - ${method} ${path} - User: ${user}`
      );
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Async wrapper for route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
