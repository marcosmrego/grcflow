import { db } from '../config/database';
import { SystemUser } from '../models/types';

/**
 * System User Repository
 * Handles all platform-level user database operations (no company scoping)
 */
export class SystemUserRepository {
  async findByEmail(email: string): Promise<SystemUser | null> {
    const result = await db.query(
      `SELECT * FROM system_users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<SystemUser | null> {
    const result = await db.query(
      `SELECT * FROM system_users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByIdWithDeleted(id: string): Promise<SystemUser | null> {
    const result = await db.query(
      `SELECT * FROM system_users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(user: Omit<SystemUser, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<SystemUser> {
    const result = await db.query(
      `INSERT INTO system_users (
        id, email, name, password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [user.id, user.email, user.name, user.password_hash, user.role, user.is_active ?? true]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<SystemUser>): Promise<SystemUser | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }
    if (updates.password_hash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.password_hash);
    }
    if (updates.last_login !== undefined) {
      fields.push(`last_login = $${paramCount++}`);
      values.push(updates.last_login);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE system_users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async softDelete(id: string): Promise<void> {
    await db.query(
      `UPDATE system_users
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async listActive(limit: number = 20, offset: number = 0): Promise<{ users: SystemUser[]; total: number }> {
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM system_users WHERE deleted_at IS NULL`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT * FROM system_users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { users: result.rows, total };
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM system_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [email]
    );
    return result.rows.length > 0;
  }

  async updateLastLogin(id: string): Promise<void> {
    await db.query(
      `UPDATE system_users SET last_login = NOW() WHERE id = $1`,
      [id]
    );
  }
}

export const systemUserRepository = new SystemUserRepository();
