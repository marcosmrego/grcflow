import express, { Request, Response } from 'express';
import { systemAuthMiddleware, requireSystemAdmin, requireMaster, asyncHandler } from '../middleware';
import { companyRepository } from '../repositories/CompanyRepository';
import { companyService } from '../services/CompanyService';
import { db } from '../config/database';

const router = express.Router();
router.use(systemAuthMiddleware, requireSystemAdmin, requireMaster);

router.get(
  '/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', ci.reference_month) = DATE_TRUNC('month', NOW()) THEN ci.amount ELSE 0 END), 0)::numeric AS mrr,
        COALESCE(SUM(CASE WHEN ci.status = 'pending' AND ci.due_date >= NOW()::date THEN ci.amount ELSE 0 END), 0)::numeric AS pending_amount,
        COALESCE(SUM(CASE WHEN ci.status = 'pending' AND ci.due_date < NOW()::date THEN ci.amount ELSE 0 END), 0)::numeric AS overdue_amount,
        COUNT(CASE WHEN ci.status = 'pending' AND ci.due_date < NOW()::date THEN 1 END)::int AS overdue_count,
        COUNT(CASE WHEN ci.status = 'pending' AND ci.due_date >= NOW()::date AND ci.due_date <= (NOW() + INTERVAL '30 days')::date THEN 1 END)::int AS upcoming_count
      FROM company_invoices ci
      JOIN companies c ON ci.company_id = c.id
      WHERE c.deleted_at IS NULL
    `);

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        mrr: parseFloat(row.mrr),
        pendingAmount: parseFloat(row.pending_amount),
        overdueAmount: parseFloat(row.overdue_amount),
        overdueCount: row.overdue_count,
        upcomingCount: row.upcoming_count,
      },
    });
  })
);

router.get(
  '/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '50')));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;
    const companyIdFilter = req.query.companyId as string | undefined;

    const params: unknown[] = [];
    const conditions: string[] = ['c.deleted_at IS NULL'];

    if (statusFilter === 'overdue') {
      conditions.push(`ci.status = 'pending' AND ci.due_date < NOW()::date`);
    } else if (statusFilter) {
      params.push(statusFilter);
      conditions.push(`ci.status = $${params.length}`);
    }

    if (companyIdFilter) {
      params.push(companyIdFilter);
      conditions.push(`ci.company_id = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM company_invoices ci JOIN companies c ON ci.company_id = c.id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const listParams = [...params, limit, offset];
    const itemsResult = await db.query(
      `SELECT ci.id, ci.company_id, c.name AS company_name,
              ci.reference_month, ci.amount, ci.due_date,
              ci.status, ci.paid_at, ci.notes, ci.created_at
       FROM company_invoices ci
       JOIN companies c ON ci.company_id = c.id
       ${where}
       ORDER BY ci.due_date DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    const items = itemsResult.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      referenceMonth: row.reference_month,
      amount: parseFloat(row.amount),
      dueDate: row.due_date,
      status: row.status,
      displayStatus: row.status === 'pending' && new Date(row.due_date) < new Date()
        ? 'overdue'
        : row.status,
      paidAt: row.paid_at ?? null,
      notes: row.notes ?? null,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: {
        items,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  })
);

router.post(
  '/companies/:id/invoices/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const company = await companyRepository.findById(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
      });
    }

    const now = new Date();
    const ref = req.body.referenceMonth
      ? new Date(req.body.referenceMonth)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const amount = (company as any).monthly_fee ?? 0;
    const dueDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 10);

    const monthLabel = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const invoice = await companyService.createInvoice(id, {
      referenceMonth: ref.toISOString().split('T')[0],
      amount,
      dueDate: dueDate.toISOString().split('T')[0],
      notes: `Fatura mensal — ${monthLabel}`,
    });

    res.status(201).json({ success: true, data: invoice });
  })
);

export default router;
