import { db } from '../config/database';
import { DocType, Tower } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class TowerRepository {
  async list(companyId: string, includeInactive = false): Promise<Tower[]> {
    const query = `
      SELECT * FROM towers
      WHERE company_id = $1 AND deleted_at IS NULL
      ${includeInactive ? '' : 'AND is_active = TRUE'}
      ORDER BY name;
    `;
    const result = await db.query(query, [companyId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findById(id: string, companyId: string): Promise<Tower | null> {
    const result = await db.query(
      'SELECT * FROM towers WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL;',
      [id, companyId]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async create(companyId: string, name: string, abbreviation: string): Promise<Tower> {
    const result = await db.query(
      `
      INSERT INTO towers (id, company_id, name, abbreviation)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
      [uuidv4(), companyId, name, abbreviation]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(
    id: string,
    companyId: string,
    updates: { name?: string; abbreviation?: string; isActive?: boolean }
  ): Promise<Tower | null> {
    const result = await db.query(
      `
      UPDATE towers
      SET name = COALESCE($3, name),
          abbreviation = COALESCE($4, abbreviation),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING *;
      `,
      [id, companyId, updates.name, updates.abbreviation, updates.isActive]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async softDelete(id: string, companyId: string): Promise<boolean> {
    const result = await db.query(
      'UPDATE towers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL;',
      [id, companyId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Atribui o próximo número sequencial para a torre + tipo de documento (RF002), nunca
   * reaproveitado mesmo se o documento for excluído ou obsoletado. Deve ser chamado dentro
   * da mesma transação da criação do documento para garantir atomicidade.
   */
  async assignNextNumber(client: { query: Function }, towerId: string, docType: DocType): Promise<number> {
    const result = await client.query(
      `
      INSERT INTO tower_document_counters (tower_id, doc_type, next_number)
      VALUES ($1, $2, 2)
      ON CONFLICT (tower_id, doc_type)
      DO UPDATE SET next_number = tower_document_counters.next_number + 1
      RETURNING next_number - 1 AS assigned_number;
      `,
      [towerId, docType]
    );
    return result.rows[0].assigned_number;
  }

  private mapRow(row: any): Tower {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      abbreviation: row.abbreviation,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const towerRepository = new TowerRepository();
