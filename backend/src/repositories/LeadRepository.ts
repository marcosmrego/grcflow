import { db } from '../config/database';
import { Lead } from '../models/types';

const mapRow = (row: any): Lead => ({
  id: row.id,
  name: row.name,
  email: row.email,
  companyName: row.company_name,
  phone: row.phone,
  message: row.message,
  source: row.source,
  createdAt: row.created_at,
});

/**
 * Lead Repository
 * Handles storage of leads captured by the public marketing landing page
 */
export class LeadRepository {
  async create(lead: {
    name: string;
    email: string;
    companyName?: string;
    phone?: string;
    message?: string;
    source?: string;
  }): Promise<Lead> {
    const result = await db.query(
      `INSERT INTO leads (name, email, company_name, phone, message, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        lead.name,
        lead.email,
        lead.companyName || null,
        lead.phone || null,
        lead.message || null,
        lead.source || null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async list(limit: number = 20, offset: number = 0, search?: string): Promise<{ leads: Lead[]; total: number }> {
    const trimmed = search?.trim();
    const whereClause = trimmed ? `WHERE name ILIKE $1 OR email ILIKE $1 OR company_name ILIKE $1` : '';
    const searchParams = trimmed ? [`%${trimmed}%`] : [];

    const countResult = await db.query(`SELECT COUNT(*) as count FROM leads ${whereClause}`, searchParams);
    const total = parseInt(countResult.rows[0].count);

    const limitIdx = searchParams.length + 1;
    const offsetIdx = searchParams.length + 2;
    const result = await db.query(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...searchParams, limit, offset]
    );

    return { leads: result.rows.map(mapRow), total };
  }

  async delete(id: string): Promise<void> {
    await db.query(`DELETE FROM leads WHERE id = $1`, [id]);
  }
}

export const leadRepository = new LeadRepository();
