import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { systemUserService } from '../services/SystemUserService';
import {
  systemAuthMiddleware,
  authLimiter,
  asyncHandler,
  AuthenticationError,
} from '../middleware';
import { ApiResponse } from '../models/types';

const router = express.Router();

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
 * POST /api/system/auth/login
 * Login for platform (system) users
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
    const result = await systemUserService.login({
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
 * GET /api/system/auth/me
 * Get current system user profile
 */
router.get(
  '/me',
  systemAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.systemUser) {
      throw new AuthenticationError('User not found');
    }

    const user = await systemUserService.getProfile(req.systemUser.id);

    const response: ApiResponse<any> = {
      success: true,
      data: user,
    };

    res.json(response);
  })
);

/**
 * POST /api/system/auth/change-password
 * Change password for the current system user
 */
router.post(
  '/change-password',
  systemAuthMiddleware,
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
    if (!req.systemUser) {
      throw new AuthenticationError('User not found');
    }

    await systemUserService.changePassword(
      req.systemUser.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    };

    res.json(response);
  })
);

export default router;
