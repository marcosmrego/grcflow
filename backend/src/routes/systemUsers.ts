import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { systemUserService } from '../services/SystemUserService';
import {
  systemAuthMiddleware,
  requireSystemAdmin,
  asyncHandler,
} from '../middleware';
import { ApiResponse } from '../models/types';

const router = express.Router();

router.use(systemAuthMiddleware, requireSystemAdmin);

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
 * GET /api/system/users
 * List system users (super_admin only)
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const page = (req.query.page as any) || 1;
    const limit = (req.query.limit as any) || 20;
    const offset = (page - 1) * limit;

    const { users, total } = await systemUserService.listUsers(limit, offset);

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
 * POST /api/system/users
 * Create a new system user (super_admin only)
 */
router.post(
  '/',
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
      .isIn(['super_admin', 'support'])
      .withMessage('Role must be super_admin or support'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await systemUserService.createUser({
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
 * PUT /api/system/users/:id
 * Update a system user (super_admin only)
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('role')
      .optional()
      .isIn(['super_admin', 'support'])
      .withMessage('Role must be super_admin or support'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await systemUserService.updateUser(req.params.id, {
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
 * DELETE /api/system/users/:id
 * Delete a system user (super_admin only - soft delete)
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    await systemUserService.deleteUser(req.params.id);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    };

    res.json(response);
  })
);

export default router;
