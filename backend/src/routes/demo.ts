import express, { Request, Response } from 'express';
import { demoService } from '../services/DemoService';
import { publicLimiter, asyncHandler } from '../middleware';
import { ApiResponse } from '../models/types';

const router = express.Router();

/**
 * POST /api/demo/login
 * Issues a short-lived, read-only session for the public demo company. No credentials —
 * this is a dedicated endpoint for the marketing landing page's "Ver demonstração" button,
 * not a bypass on the regular login flow.
 */
router.post(
  '/login',
  publicLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await demoService.login();

    const response: ApiResponse<any> = {
      success: true,
      data: result,
    };

    res.json(response);
  })
);

export default router;
