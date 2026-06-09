import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { companyService } from '../services/CompanyService';
import { userService } from '../services/UserService';
import {
  systemAuthMiddleware,
  requireSystemAdmin,
  asyncHandler,
  AuthenticationError,
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
 * GET /api/companies
 * List companies (system admin only)
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

    const { companies, total } = await companyService.listCompanies(limit, offset);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        items: companies,
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
 * GET /api/companies/:id
 * Get a single company (system admin only)
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid company ID')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const company = await companyService.getCompany(req.params.id);

    const response: ApiResponse<any> = {
      success: true,
      data: company,
    };

    res.json(response);
  })
);

/**
 * POST /api/companies
 * Create a new company (system admin only)
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('document').optional().trim().isLength({ max: 50 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.systemUser) {
      throw new AuthenticationError('User not authenticated');
    }

    const company = await companyService.createCompany(
      {
        name: req.body.name,
        document: req.body.document,
      },
      req.systemUser.id
    );

    const response: ApiResponse<any> = {
      success: true,
      data: company,
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/companies/:id/users
 * List all users of a company (system admin only)
 */
router.get(
  '/:id/users',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const page = (req.query.page as any) || 1;
    const limit = (req.query.limit as any) || 50;
    const offset = (page - 1) * limit;

    await companyService.getCompany(req.params.id);

    const { users, total } = await userService.listUsers(req.params.id, limit, offset);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        items: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    res.json(response);
  })
);

/**
 * POST /api/companies/:id/admin-user
 * Create the initial admin user for a company (system admin only)
 */
router.post(
  '/:id/admin-user',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
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
      .withMessage('Password must be at least 8 characters long'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.systemUser) {
      throw new AuthenticationError('User not authenticated');
    }

    const company = await companyService.getCompany(req.params.id);

    const user = await userService.createUser(company.id, {
      email: req.body.email,
      name: req.body.name,
      role: 'admin',
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
 * PUT /api/companies/:id
 * Update a company (system admin only)
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    body('name').optional().trim().isLength({ min: 2, max: 255 }),
    body('document').optional().trim().isLength({ max: 50 }),
    body('is_active').optional().isBoolean(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.systemUser) {
      throw new AuthenticationError('User not authenticated');
    }

    const company = await companyService.updateCompany(
      req.params.id,
      {
        name: req.body.name,
        document: req.body.document,
        is_active: req.body.is_active,
      },
      req.systemUser.id
    );

    const response: ApiResponse<any> = {
      success: true,
      data: company,
    };

    res.json(response);
  })
);

/**
 * DELETE /api/companies/:id
 * Delete a company (system admin only - soft delete)
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid company ID')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.systemUser) {
      throw new AuthenticationError('User not authenticated');
    }

    await companyService.deleteCompany(req.params.id, req.systemUser.id);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'Company deleted successfully',
      },
    };

    res.json(response);
  })
);

export default router;
