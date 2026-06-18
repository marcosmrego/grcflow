import { db } from '../config/database';
import { Company } from '../models/types';

/**
 * Company Repository
 * Handles all company (tenant) database operations
 */
type CompanyCommercialFields = Pick<
  Company,
  'legal_name' | 'segment' | 'website' | 'contact_name' | 'contact_email' | 'contact_phone' |
  'address' | 'city' | 'state' | 'zip_code' | 'monthly_fee' | 'notes'
>;

export class CompanyRepository {
  async create(
    company: { id: string; name: string; document?: string; is_active: boolean; created_by?: string } & Partial<CompanyCommercialFields>
  ): Promise<Company> {
    const result = await db.query(
      `INSERT INTO companies (
        id, name, document, is_active, created_by,
        legal_name, segment, website, contact_name, contact_email, contact_phone,
        address, city, state, zip_code, monthly_fee, notes
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        company.id,
        company.name,
        company.document || null,
        company.is_active,
        company.created_by || null,
        company.legal_name || null,
        company.segment || null,
        company.website || null,
        company.contact_name || null,
        company.contact_email || null,
        company.contact_phone || null,
        company.address || null,
        company.city || null,
        company.state || null,
        company.zip_code || null,
        company.monthly_fee ?? null,
        company.notes || null,
      ]
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
    if (updates.legal_name !== undefined) {
      fields.push(`legal_name = $${paramCount++}`);
      values.push(updates.legal_name);
    }
    if (updates.segment !== undefined) {
      fields.push(`segment = $${paramCount++}`);
      values.push(updates.segment);
    }
    if (updates.website !== undefined) {
      fields.push(`website = $${paramCount++}`);
      values.push(updates.website);
    }
    if (updates.contact_name !== undefined) {
      fields.push(`contact_name = $${paramCount++}`);
      values.push(updates.contact_name);
    }
    if (updates.contact_email !== undefined) {
      fields.push(`contact_email = $${paramCount++}`);
      values.push(updates.contact_email);
    }
    if (updates.contact_phone !== undefined) {
      fields.push(`contact_phone = $${paramCount++}`);
      values.push(updates.contact_phone);
    }
    if (updates.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(updates.address);
    }
    if (updates.city !== undefined) {
      fields.push(`city = $${paramCount++}`);
      values.push(updates.city);
    }
    if (updates.state !== undefined) {
      fields.push(`state = $${paramCount++}`);
      values.push(updates.state);
    }
    if (updates.zip_code !== undefined) {
      fields.push(`zip_code = $${paramCount++}`);
      values.push(updates.zip_code);
    }
    if (updates.monthly_fee !== undefined) {
      fields.push(`monthly_fee = $${paramCount++}`);
      values.push(updates.monthly_fee);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(updates.notes);
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
