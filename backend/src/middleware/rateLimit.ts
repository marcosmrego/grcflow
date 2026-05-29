import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General rate limiter - 100 requests per minute
 */
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for auth endpoints - 5 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many login attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + user email as key
  keyGenerator: (req: Request) => {
    return `${req.ip}-${req.body?.email || 'unknown'}`;
  },
});

/**
 * Moderate rate limiter for sensitive operations - 20 requests per minute
 */
export const moderateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for file uploads - 10 requests per minute
 */
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT',
      message: 'Too many uploads, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limiter for public endpoints - 30 per hour
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    error: {
      code: 'PUBLIC_RATE_LIMIT',
      message: 'Too many requests from your IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
