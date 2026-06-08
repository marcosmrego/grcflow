import { db } from '../config/database';
import { Company } from '../models/types';

/**
 * Company Repository
 * Handles all company (tenant) database operations
 */
export class CompanyRepository {
  async create(company: { id: string; name: string; document?: string; is_active: boolean; created_by?: string }): Promise<Company> {
    const result = await db.query(
      `INSERT INTO companies (id, name, document, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [company.id, company.name, company.document || null, company.is_active, company.created_by || null]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Company | null> {
    const result = await db.query(
      `SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByIdWithDeleted(id: string): Promise<Company | null> {
    const result = await db.query(
      `SELECT * FROM companies WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<Company> & { updated_by?: string }): Promise<Company | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.document !== undefined) {
      fields.push(`document = $${paramCount++}`);
      values.push(updates.document);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.updated_by !== undefined) {
      fields.push(`updated_by = $${paramCount++}`);
      values.push(updates.updated_by);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE companies
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await db.query(
      `UPDATE companies
       SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [deletedBy, id]
    );
  }

  async list(limit: number = 20, offset: number = 0): Promise<{ companies: Company[]; total: number }> {
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM companies WHERE deleted_at IS NULL`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT * FROM companies
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { companies: result.rows, total };
  }

  async nameExists(name: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM companies WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
      [name]
    );
    return result.rows.length > 0;
  }
}

export const companyRepository = new CompanyRepository();
