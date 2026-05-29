import { db } from '../config/database';
import { User } from '../models/types';

/**
 * User Repository
 * Handles all user database operations
 */
export class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID including deleted
   */
  async findByIdWithDeleted(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async create(user: Omit<User, 'created_at' | 'updated_at' | 'deleted_at'>): Promise<User> {
    const result = await db.query(
      `INSERT INTO users (
        id, email, name, password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [user.id, user.email, user.name, user.password_hash, user.role, user.is_active || true]
    );
    return result.rows[0];
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Construir query dinamicamente
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
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    await db.query(
      `UPDATE users 
       SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [deletedBy, id]
    );
  }

  /**
   * List all active users (admin only)
   */
  async listActive(limit: number = 20, offset: number = 0): Promise<{
    users: User[];
    total: number;
  }> {
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT * FROM users 
       WHERE deleted_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      users: result.rows,
      total,
    };
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string): Promise<void> {
    await db.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [id]
    );
  }
}

export const userRepository = new UserRepository();
