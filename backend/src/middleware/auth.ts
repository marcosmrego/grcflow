import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, SystemJWTPayload, SystemUserPayload, UserPayload } from '../models/types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      systemUser?: SystemUserPayload;
      token?: string;
    }
  }
}

/**
 * Extract and verify JWT token from Authorization header
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authorization token required',
        },
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format. Use: Bearer {token}',
        },
      });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

      if (!decoded.companyId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token does not belong to a company user.',
          },
        });
      }

      // Add user to request
      req.user = {
        id: decoded.sub,
        companyId: decoded.companyId,
        email: decoded.email,
        name: '', // Name not in JWT, should be fetched from DB if needed
        role: decoded.role,
        isMaster: decoded.isMaster ?? false,
      };

      req.token = token;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired. Please login again.',
          },
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or malformed token.',
          },
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred',
      },
    });
  }
};

/**
 * Optional auth - doesn't fail if token is missing, but validates if present
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      if (decoded.companyId) {
        req.user = {
          id: decoded.sub,
          companyId: decoded.companyId,
          email: decoded.email,
          name: '',
          role: decoded.role,
          isMaster: decoded.isMaster ?? false,
        };
        req.token = token;
      }
    } catch (error) {
      // Silently ignore token errors in optional auth
      console.debug('Optional auth token validation skipped');
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Extract and verify JWT token of a system (platform) user from Authorization header.
 * Mirrors authMiddleware but populates req.systemUser and rejects tokens that carry a companyId
 * (those belong to company users, not platform operators).
 */
export const systemAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authorization token required',
        },
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format. Use: Bearer {token}',
        },
      });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload | SystemJWTPayload;

      if ('companyId' in decoded) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token does not belong to a system user.',
          },
        });
      }

      req.systemUser = {
        id: decoded.sub,
        email: decoded.email,
        name: '',
        role: decoded.role,
        isMaster: decoded.isMaster ?? false,
      };

      req.token = token;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired. Please login again.',
          },
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or malformed token.',
          },
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('System auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred',
      },
    });
  }
};

/**
 * Require system user to be authenticated
 */
export const requireSystemAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.systemUser) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'System authentication required',
      },
    });
  }

  next();
};

/**
 * Require user to be authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  next();
};
