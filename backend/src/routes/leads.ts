import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { leadService } from '../services/LeadService';
import {
  systemAuthMiddleware,
  requireSystemAdmin,
  publicLimiter,
  asyncHandler,
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
 * POST /api/leads
 * Capture a lead from the public marketing landing page. No authentication.
 */
router.post(
  '/',
  publicLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Nome é obrigatório'),
    body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
    body('companyName').optional().trim().isLength({ max: 255 }),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('message').optional().trim().isLength({ max: 2000 }),
    body('source').optional().trim().isLength({ max: 100 }),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const lead = await leadService.create({
      name: req.body.name,
      email: req.body.email,
      companyName: req.body.companyName,
      phone: req.body.phone,
      message: req.body.message,
      source: req.body.source,
    });

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: lead.id },
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/leads
 * List captured leads (platform admin only)
 */
router.get(
  '/',
  systemAuthMiddleware,
  requireSystemAdmin,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const page = (req.query.page as any) || 1;
    const limit = (req.query.limit as any) || 20;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    const { leads, total } = await leadService.list(limit, offset, search);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        items: leads,
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
 * DELETE /api/leads/:id
 * Remove a captured lead (platform admin only — spam cleanup)
 */
router.delete(
  '/:id',
  systemAuthMiddleware,
  requireSystemAdmin,
  [param('id').isUUID().withMessage('ID inválido')],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    await leadService.delete(req.params.id);

    const response: ApiResponse<null> = { success: true };
    res.json(response);
  })
);

export default router;
