import { db } from '../config/database';
import { CompanyModule } from '../models/types';

export class CompanyModuleRepository {
  /**
   * Lista os módulos do catálogo já com o estado de aquisição da empresa (join). Módulos do
   * catálogo sem linha em company_modules aparecem como inativos (empresa nunca contratou).
   */
  async listForCompany(companyId: string): Promise<CompanyModule[]> {
    const result = await db.query(
      `
      SELECT
        m.key AS module_key,
        m.name,
        m.description,
        COALESCE(cm.is_active, FALSE) AS is_active,
        COALESCE(cm.price, m.default_price) AS price,
        COALESCE(cm.acquired_at, m.created_at) AS acquired_at,
        COALESCE(cm.updated_at, m.updated_at) AS updated_at
      FROM modules m
      LEFT JOIN company_modules cm ON cm.module_key = m.key AND cm.company_id = $1
      WHERE m.is_active = TRUE
      ORDER BY m.name;
      `,
      [companyId]
    );
    return result.rows.map(row => this.mapRow(companyId, row));
  }

  async isActive(companyId: string, moduleKey: string): Promise<boolean> {
    const result = await db.query(
      'SELECT is_active FROM company_modules WHERE company_id = $1 AND module_key = $2;',
      [companyId, moduleKey]
    );
    return result.rows.length > 0 ? result.rows[0].is_active === true : false;
  }

  /**
   * Cria uma linha (inativa) por módulo do catálogo pra uma empresa nova, pra UI sempre ter
   * algo pra exibir/alternar em vez de depender de "linha ausente = inativo".
   */
  async initializeForCompany(companyId: string): Promise<void> {
    await db.query(
      `
      INSERT INTO company_modules (company_id, module_key, is_active, price)
      SELECT $1, m.key, FALSE, m.default_price
      FROM modules m
      WHERE m.is_active = TRUE
      ON CONFLICT (company_id, module_key) DO NOTHING;
      `,
      [companyId]
    );
  }

  async setForCompany(
    companyId: string,
    moduleKey: string,
    updates: { isActive?: boolean; price?: number | null }
  ): Promise<CompanyModule | null> {
    await db.query(
      `
      INSERT INTO company_modules (company_id, module_key, is_active, price)
      VALUES ($1, $2, COALESCE($3, FALSE), $4)
      ON CONFLICT (company_id, module_key) DO UPDATE SET
        is_active = COALESCE($3, company_modules.is_active),
        price = COALESCE($4, company_modules.price),
        updated_at = CURRENT_TIMESTAMP;
      `,
      [companyId, moduleKey, updates.isActive, updates.price]
    );

    const result = await db.query(
      `
      SELECT m.key AS module_key, m.name, m.description, cm.is_active, cm.price, cm.acquired_at, cm.updated_at
      FROM company_modules cm
      JOIN modules m ON m.key = cm.module_key
      WHERE cm.company_id = $1 AND cm.module_key = $2;
      `,
      [companyId, moduleKey]
    );
    return result.rows.length > 0 ? this.mapRow(companyId, result.rows[0]) : null;
  }

  private mapRow(companyId: string, row: any): CompanyModule {
    return {
      companyId,
      moduleKey: row.module_key,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      price: row.price !== null && row.price !== undefined ? parseFloat(row.price) : null,
      acquiredAt: new Date(row.acquired_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const companyModuleRepository = new CompanyModuleRepository();
