import { db } from '../config/database';
import { KnowledgeItem } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class KnowledgeRepository {
  async create(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    const id = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO knowledge_items (id, category, title, description, content, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
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

  async findById(id: string): Promise<KnowledgeItem | null> {
    const query = 'SELECT * FROM knowledge_items WHERE id = $1;';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByCategory(category: string, limit = 20, offset = 0): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items 
      WHERE category = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(query, [category, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByTag(tag: string): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items 
      WHERE tags @> $1
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [JSON.stringify([tag])]);
    return result.rows.map(row => this.mapRow(row));
  }

  async search(query: string): Promise<KnowledgeItem[]> {
    const searchQuery = `
      SELECT * FROM knowledge_items 
      WHERE to_tsvector('portuguese', title || ' ' || description || ' ' || content) 
            @@ plainto_tsquery('portuguese', $1)
      ORDER BY created_at DESC;
    `;
    const result = await db.query(searchQuery, [query]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    const now = new Date();
    const query = `
      UPDATE knowledge_items 
      SET title = COALESCE($2, title),
          description = COALESCE($3, description),
          content = COALESCE($4, content),
          tags = COALESCE($5, tags),
          category = COALESCE($6, category),
          updated_at = $7
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      updates.title,
      updates.description,
      updates.content,
      updates.tags ? JSON.stringify(updates.tags) : null,
      updates.category,
      now,
    ]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM knowledge_items WHERE id = $1;';
    const result = await db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async list(limit = 50, offset = 0): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2;
    `;
    const result = await db.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: any): KnowledgeItem {
    return {
      id: row.id,
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
