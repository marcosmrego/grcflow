import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { CompanyInvoice, InvoiceActionLog, InvoiceStatus } from '../models/types';

export class CompanyInvoiceRepository {
  async listForCompany(companyId: string): Promise<CompanyInvoice[]> {
    const result = await db.query(
      'SELECT * FROM company_invoices WHERE company_id = $1 ORDER BY reference_month DESC;',
      [companyId]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  async findById(id: string, companyId: string): Promise<CompanyInvoice | null> {
    const result = await db.query(
      'SELECT * FROM company_invoices WHERE id = $1 AND company_id = $2;',
      [id, companyId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async create(companyId: string, data: { referenceMonth: Date; amount: number; dueDate: Date; notes?: string | null }): Promise<CompanyInvoice> {
    const result = await db.query(
      `INSERT INTO company_invoices (id, company_id, reference_month, amount, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [uuidv4(), companyId, data.referenceMonth, data.amount, data.dueDate, data.notes || null]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    companyId: string,
    updates: { amount?: number; dueDate?: Date; status?: InvoiceStatus; notes?: string | null }
  ): Promise<CompanyInvoice | null> {
    const paidAtClause = updates.status === 'paid' ? 'CURRENT_TIMESTAMP' : updates.status ? 'NULL' : 'paid_at';

    const result = await db.query(
      `UPDATE company_invoices
       SET amount = COALESCE($3, amount),
           due_date = COALESCE($4, due_date),
           status = COALESCE($5, status),
           notes = COALESCE($6, notes),
           paid_at = ${paidAtClause},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *;`,
      [id, companyId, updates.amount, updates.dueDate, updates.status, updates.notes]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async markSent(id: string, companyId: string): Promise<CompanyInvoice | null> {
    const result = await db.query(
      `UPDATE company_invoices
       SET sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING *;`,
      [id, companyId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await db.query('DELETE FROM company_invoices WHERE id = $1 AND company_id = $2;', [id, companyId]);
    return (result.rowCount ?? 0) > 0;
  }

  async logAction(data: {
    invoiceId: string;
    companyId: string;
    action: string;
    performedById?: string | null;
    performedByName?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db.query(
      `INSERT INTO invoice_action_logs (id, invoice_id, company_id, action, performed_by, performed_by_name, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        uuidv4(),
        data.invoiceId,
        data.companyId,
        data.action,
        data.performedById ?? null,
        data.performedByName ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  }

  async getActionLogs(invoiceId: string): Promise<InvoiceActionLog[]> {
    const result = await db.query(
      `SELECT id, invoice_id, company_id, action, performed_by, performed_by_name, metadata, created_at
       FROM invoice_action_logs
       WHERE invoice_id = $1
       ORDER BY created_at DESC;`,
      [invoiceId]
    );
    return result.rows.map(row => ({
      id: row.id,
      invoiceId: row.invoice_id,
      companyId: row.company_id,
      action: row.action,
      performedById: row.performed_by ?? null,
      performedByName: row.performed_by_name ?? null,
      metadata: row.metadata ?? null,
      createdAt: new Date(row.created_at),
    }));
  }

  private mapRow(row: any): CompanyInvoice {
    const status: InvoiceStatus = row.status;
    const dueDate = new Date(row.due_date);
    const isOverdue = status === 'pending' && dueDate.getTime() < Date.now();

    return {
      id: row.id,
      companyId: row.company_id,
      referenceMonth: new Date(row.reference_month),
      amount: parseFloat(row.amount),
      dueDate,
      status,
      displayStatus: isOverdue ? 'overdue' : status,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const companyInvoiceRepository = new CompanyInvoiceRepository();
