import { db } from '../config/database';
import { KnowledgeItem } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class KnowledgeRepository {
  async create(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    const id = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO knowledge_items (id, company_id, category, title, description, content, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      item.companyId,
      item.category,
      item.title,
      item.description,
      item.content,
      JSON.stringify(item.tags),
      now,
      now,
    ]);
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string, companyId: string): Promise<KnowledgeItem | null> {
    const query = 'SELECT * FROM knowledge_items WHERE id = $1 AND company_id = $2;';
    const result = await db.query(query, [id, companyId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByCategory(companyId: string, category: string, limit = 20, offset = 0): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1 AND category = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
    `;
    const result = await db.query(query, [companyId, category, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByTag(companyId: string, tag: string): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1 AND tags @> $2
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [companyId, JSON.stringify([tag])]);
    return result.rows.map(row => this.mapRow(row));
  }

  async search(companyId: string, query: string): Promise<KnowledgeItem[]> {
    const searchQuery = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1
            AND to_tsvector('portuguese', title || ' ' || description || ' ' || content)
                @@ plainto_tsquery('portuguese', $2)
      ORDER BY created_at DESC;
    `;
    const result = await db.query(searchQuery, [companyId, query]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id: string, companyId: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    const now = new Date();
    const query = `
      UPDATE knowledge_items
      SET title = COALESCE($3, title),
          description = COALESCE($4, description),
          content = COALESCE($5, content),
          tags = COALESCE($6, tags),
          category = COALESCE($7, category),
          updated_at = $8
      WHERE id = $1 AND company_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      companyId,
      updates.title,
      updates.description,
      updates.content,
      updates.tags ? JSON.stringify(updates.tags) : null,
      updates.category,
      now,
    ]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const query = 'DELETE FROM knowledge_items WHERE id = $1 AND company_id = $2;';
    const result = await db.query(query, [id, companyId]);
    return (result.rowCount ?? 0) > 0;
  }

  async list(companyId: string, limit = 50, offset = 0): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(query, [companyId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): KnowledgeItem {
    return {
      id: row.id,
      companyId: row.company_id,
      category: row.category,
      title: row.title,
      description: row.description,
      content: row.content,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const knowledgeRepository = new KnowledgeRepository();
