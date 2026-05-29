import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { userService } from '../services/UserService';
import {
  authMiddleware,
  requireAdmin,
  asyncHandler,
  ApiResponse,
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
 * GET /api/users
 * List all users (admin only)
 */
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .toInt()
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt()
      .withMessage('Limit must be between 1 and 100'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const page = (req.query.page as any) || 1;
    const limit = (req.query.limit as any) || 20;
    const offset = (page - 1) * limit;

    const { users, total } = await userService.listUsers(limit, offset);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        items: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    };

    res.json(response);
  })
);

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post(
  '/',
  authMiddleware,
  requireAdmin,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('role')
      .isIn(['admin', 'editor', 'viewer'])
      .withMessage('Role must be admin, editor, or viewer'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser({
      email: req.body.email,
      name: req.body.name,
      role: req.body.role,
      password: req.body.password,
    });

    const response: ApiResponse<any> = {
      success: true,
      data: user,
    };

    res.status(201).json(response);
  })
);

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'editor', 'viewer'])
      .withMessage('Role must be admin, editor, or viewer'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.params.id, {
      name: req.body.name,
      role: req.body.role,
      is_active: req.body.is_active,
    });

    const response: ApiResponse<any> = {
      success: true,
      data: user,
    };

    res.json(response);
  })
);

/**
 * DELETE /api/users/:id
 * Delete user (admin only - soft delete)
 */
router.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid user ID'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    await userService.deleteUser(req.params.id, req.user.id);

    const response: ApiResponse<null> = {
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    };

    res.json(response);
  })
);

export default router;
