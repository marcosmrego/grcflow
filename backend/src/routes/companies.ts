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

const commercialFieldValidators = [
  body('legalName').optional().trim().isLength({ max: 255 }),
  body('segment').optional().trim().isLength({ max: 100 }),
  body('website').optional().trim().isLength({ max: 255 }),
  body('contactName').optional().trim().isLength({ max: 255 }),
  body('contactEmail').optional({ checkFalsy: true }).isEmail().withMessage('Invalid contact email'),
  body('contactPhone').optional().trim().isLength({ max: 50 }),
  body('address').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('state').optional().trim().isLength({ max: 2 }),
  body('zipCode').optional().trim().isLength({ max: 20 }),
  body('monthlyFee').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('monthlyFee must be a non-negative number'),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const commercialFieldsFromBody = (body: any) => ({
  legalName: body.legalName,
  segment: body.segment,
  website: body.website,
  contactName: body.contactName,
  contactEmail: body.contactEmail,
  contactPhone: body.contactPhone,
  address: body.address,
  city: body.city,
  state: body.state,
  zipCode: body.zipCode,
  monthlyFee: body.monthlyFee === undefined ? undefined : (body.monthlyFee === null || body.monthlyFee === '' ? null : parseFloat(body.monthlyFee)),
  notes: body.notes,
});

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
    ...commercialFieldValidators,
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
        ...commercialFieldsFromBody(req.body),
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
    ...commercialFieldValidators,
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
        ...commercialFieldsFromBody(req.body),
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
 * GET /api/companies/:id/modules
 * List catalog modules merged with this company's acquisition state (system admin only)
 */
router.get(
  '/:id/modules',
  [param('id').isUUID().withMessage('Invalid company ID')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const modules = await companyService.listModules(req.params.id);
    const response: ApiResponse<any> = { success: true, data: modules };
    res.json(response);
  })
);

/**
 * PUT /api/companies/:id/modules/:moduleKey
 * Grant/revoke a module and/or set its price for this company (system admin only)
 */
router.put(
  '/:id/modules/:moduleKey',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    param('moduleKey').isString(),
    body('isActive').optional().isBoolean(),
    body('price').optional({ nullable: true }).isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const module = await companyService.setModule(req.params.id, req.params.moduleKey, {
      isActive: req.body.isActive,
      price: req.body.price === null || req.body.price === undefined ? undefined : parseFloat(req.body.price),
    });
    const response: ApiResponse<any> = { success: true, data: module };
    res.json(response);
  })
);

/**
 * GET /api/companies/:id/invoices
 * List monthly billing history for a company (system admin only)
 */
router.get(
  '/:id/invoices',
  [param('id').isUUID().withMessage('Invalid company ID')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const invoices = await companyService.listInvoices(req.params.id);
    const response: ApiResponse<any> = { success: true, data: invoices };
    res.json(response);
  })
);

/**
 * POST /api/companies/:id/invoices
 * Create a new monthly invoice/charge (system admin only)
 */
router.post(
  '/:id/invoices',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    body('referenceMonth').isISO8601().withMessage('referenceMonth must be a date'),
    body('amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
    body('dueDate').isISO8601().withMessage('dueDate must be a date'),
    body('notes').optional().trim().isLength({ max: 2000 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await companyService.createInvoice(req.params.id, {
      referenceMonth: req.body.referenceMonth,
      amount: parseFloat(req.body.amount),
      dueDate: req.body.dueDate,
      notes: req.body.notes,
    });
    const response: ApiResponse<any> = { success: true, data: invoice };
    res.status(201).json(response);
  })
);

/**
 * PUT /api/companies/:id/invoices/:invoiceId
 * Update an invoice — amount/due date/notes, or mark as paid/cancelled (system admin only)
 */
router.put(
  '/:id/invoices/:invoiceId',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    param('invoiceId').isUUID().withMessage('Invalid invoice ID'),
    body('amount').optional().isFloat({ min: 0 }),
    body('dueDate').optional().isISO8601(),
    body('status').optional().isIn(['pending', 'paid', 'cancelled']),
    body('notes').optional().trim().isLength({ max: 2000 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await companyService.updateInvoice(req.params.id, req.params.invoiceId, {
      amount: req.body.amount === undefined ? undefined : parseFloat(req.body.amount),
      dueDate: req.body.dueDate,
      status: req.body.status,
      notes: req.body.notes,
    });
    const response: ApiResponse<any> = { success: true, data: invoice };
    res.json(response);
  })
);

/**
 * DELETE /api/companies/:id/invoices/:invoiceId
 * Remove an invoice entry (system admin only)
 */
router.delete(
  '/:id/invoices/:invoiceId',
  [
    param('id').isUUID().withMessage('Invalid company ID'),
    param('invoiceId').isUUID().withMessage('Invalid invoice ID'),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    await companyService.deleteInvoice(req.params.id, req.params.invoiceId);
    const response: ApiResponse<{ message: string }> = { success: true, data: { message: 'Invoice deleted successfully' } };
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
