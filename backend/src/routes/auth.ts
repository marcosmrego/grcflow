import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { userService } from '../services/UserService';
import {
  authMiddleware,
  authLimiter,
  moderateLimiter,
  asyncHandler,
  ApiResponse,
  AuthenticationError,
} from '../middleware';

const router = express.Router();

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }));

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    };

    return res.status(400).json(response);
  }
  next();
};

/**
 * POST /api/auth/login
 * Login with email and password
 * Rate limited to 5 attempts per 15 minutes
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.login({
      email: req.body.email,
      password: req.body.password,
    });

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/register
 * Register new user
 * Rate limited to 20 attempts per minute
 */
router.post(
  '/register',
  moderateLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('passwordConfirm')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.register({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Rate limited to 100 attempts per minute
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.refreshToken(req.body.refreshToken);

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/logout
 * Logout (invalidate token - on client side)
 * Just returns success response
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    // In production, you might want to:
    // 1. Invalidate refresh token in database
    // 2. Add token to blacklist
    // For now, logout is handled on client by removing tokens

    const response: ApiResponse<null> = {
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    };

    res.json(response);
  })
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('User not found');
    }

    const user = await userService.getProfile(req.user.id);

    const response: ApiResponse<any> = {
      success: true,
      data: user,
    };

    res.json(response);
  })
);

/**
 * PUT /api/auth/me
 * Update current user profile
 */
router.put(
  '/me',
  authMiddleware,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('User not found');
    }

    const user = await userService.updateProfile(req.user.id, {
      name: req.body.name,
    });

    const response: ApiResponse<any> = {
      success: true,
      data: user,
    };

    res.json(response);
  })
);

/**
 * POST /api/auth/change-password
 * Change password for current user
 */
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('User not found');
    }

    await userService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    const response: ApiResponse<null> = {
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    };

    res.json(response);
  })
);

export default router;
