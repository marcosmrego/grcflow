import { db } from '../config/database';
import { ModuleDefinition } from '../models/types';

/**
 * Catálogo de módulos comercializáveis da plataforma (knowledge_base, flows, ...).
 * Somente leitura por enquanto — novos módulos entram via migration.
 */
export class ModuleRepository {
  async list(): Promise<ModuleDefinition[]> {
    const result = await db.query('SELECT * FROM modules WHERE is_active = TRUE ORDER BY name;');
    return result.rows.map(row => this.mapRow(row));
  }

  async findByKey(key: string): Promise<ModuleDefinition | null> {
    const result = await db.query('SELECT * FROM modules WHERE key = $1;', [key]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: any): ModuleDefinition {
    return {
      key: row.key,
      name: row.name,
      description: row.description,
      defaultPrice: parseFloat(row.default_price),
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const moduleRepository = new ModuleRepository();
