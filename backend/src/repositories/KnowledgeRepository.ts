import { db } from '../config/database';
import {
  ApprovalDecision,
  KnowledgeItem,
  KnowledgeItemApproval,
  KnowledgeItemVersion,
  KnowledgeStats,
} from '../models/types';
import { ConflictError, ValidationError } from '../middleware/errorHandler';
import { towerRepository } from './TowerRepository';
import { v4 as uuidv4 } from 'uuid';

// Papel do validador em cada nível da alçada de aprovação (RF004)
export const APPROVAL_LEVELS: { level: 1 | 2 | 3; approverRole: string }[] = [
  { level: 1, approverRole: 'technical' },
  { level: 2, approverRole: 'compliance' },
  { level: 3, approverRole: 'final' },
];

// Status que o perfil visualizador não pode ver: documentos ainda não aprovados
// (apenas ADM e editor acompanham o documento em revisão/aprovação).
const VIEWER_HIDDEN_STATUSES = ['draft', 'in_review', 'pending_approval'];
const VIEWER_STATUS_FILTER = `AND status NOT IN ('${VIEWER_HIDDEN_STATUSES.join("','")}')`;

export class KnowledgeRepository {
  async create(
    item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvedAt' | 'expiresAt' | 'documentCode'> & {
      status?: KnowledgeItem['status'];
    },
    author: { id: string; name: string; email: string }
  ): Promise<KnowledgeItem> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const id = uuidv4();
      const now = new Date();
      const status = item.status || 'draft';

      // RF002: código gerado automaticamente a partir da torre/departamento (combinado
      // com Thiago em 17/06/2026) — documentos do tipo ARTICLE não exigem código.
      let documentCode: string | null = null;
      if (item.docType !== 'ARTICLE') {
        if (!item.towerId) {
          throw new ValidationError('Selecione uma torre/departamento para gerar o código do documento.', {
            field: 'towerId',
          });
        }
        const tower = await towerRepository.findById(item.towerId, item.companyId);
        if (!tower) throw new ValidationError('Torre/departamento não encontrada.', { field: 'towerId' });

        const number = await towerRepository.assignNextNumber(client, tower.id, item.docType);
        documentCode = `${item.docType}_${tower.abbreviation}_${String(number).padStart(3, '0')}`;
      }

      const insertResult = await client.query(
        `
        INSERT INTO knowledge_items (
          id, company_id, category, category_id, title, description, content, tags,
          doc_type, document_code, tower_id, confidentiality, validity_days, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
        `,
        [
          id,
          item.companyId,
          item.category,
          item.categoryId || null,
          item.title,
          item.description,
          item.content,
          JSON.stringify(item.tags),
          item.docType,
          documentCode,
          item.towerId || null,
          item.confidentiality,
          item.validityDays,
          status,
          now,
          now,
        ]
      );

      await client.query(
        `
        INSERT INTO knowledge_item_versions (
          knowledge_item_id, version_number, title, description, content, category_id, tags, status,
          created_by, created_by_name, created_by_email
        )
        VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          id,
          item.title,
          item.description,
          item.content,
          item.categoryId || null,
          JSON.stringify(item.tags),
          status,
          author.id,
          author.name,
          author.email,
        ]
      );

      await client.query('COMMIT');
      return this.mapRow(insertResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(id: string, companyId: string): Promise<KnowledgeItem | null> {
    const query = 'SELECT * FROM knowledge_items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL;';
    const result = await db.query(query, [id, companyId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByCategory(
    companyId: string,
    category: string,
    limit = 20,
    offset = 0,
    restrictToVisible = false
  ): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1 AND category = $2 AND deleted_at IS NULL
      ${restrictToVisible ? VIEWER_STATUS_FILTER : ''}
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
    `;
    const result = await db.query(query, [companyId, category, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByTag(companyId: string, tag: string, restrictToVisible = false): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1 AND tags @> $2 AND deleted_at IS NULL
      ${restrictToVisible ? VIEWER_STATUS_FILTER : ''}
      ORDER BY created_at DESC;
    `;
    const result = await db.query(query, [companyId, JSON.stringify([tag])]);
    return result.rows.map(row => this.mapRow(row));
  }

  async search(companyId: string, query: string, restrictToVisible = false): Promise<KnowledgeItem[]> {
    const searchQuery = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1
            AND deleted_at IS NULL
            AND to_tsvector('portuguese', title || ' ' || description || ' ' || content)
                @@ plainto_tsquery('portuguese', $2)
            ${restrictToVisible ? VIEWER_STATUS_FILTER : ''}
      ORDER BY created_at DESC;
    `;
    const result = await db.query(searchQuery, [companyId, query]);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Atualiza um item, salvando o estado anterior como nova versão (RF-02/03, RF006).
   */
  async update(
    id: string,
    companyId: string,
    updates: Partial<
      Pick<
        KnowledgeItem,
        'title' | 'description' | 'content' | 'tags' | 'category' | 'categoryId' | 'confidentiality' | 'validityDays' | 'status'
      >
    >,
    author: { id: string; name: string; email: string },
    changeMeta?: { changeReason?: string; affectedSection?: string }
  ): Promise<KnowledgeItem | null> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        'SELECT * FROM knowledge_items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE;',
        [id, companyId]
      );
      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const current = this.mapRow(currentResult.rows[0]);

      // RF003: documento "aguardando aprovação" fica bloqueado para edições.
      if (current.status === 'pending_approval') {
        await client.query('ROLLBACK');
        throw new ConflictError('Documento aguardando aprovação não pode ser editado.');
      }

      const versionNumberResult = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM knowledge_item_versions WHERE knowledge_item_id = $1;',
        [id]
      );
      const nextVersion = versionNumberResult.rows[0].next;

      // RF003: editar um documento "aprovado" o devolve para "em revisão" — a versão
      // aprovada anterior permanece disponível no histórico até a nova publicação.
      const nextStatus = updates.status ?? (current.status === 'published' ? 'in_review' : current.status);

      const now = new Date();
      const result = await client.query(
        `
        UPDATE knowledge_items
        SET title = COALESCE($3, title),
            description = COALESCE($4, description),
            content = COALESCE($5, content),
            tags = COALESCE($6, tags),
            category = COALESCE($7, category),
            category_id = COALESCE($8, category_id),
            confidentiality = COALESCE($9, confidentiality),
            validity_days = COALESCE($10, validity_days),
            status = $11,
            updated_at = $12
        WHERE id = $1 AND company_id = $2
        RETURNING *;
        `,
        [
          id,
          companyId,
          updates.title,
          updates.description,
          updates.content,
          updates.tags ? JSON.stringify(updates.tags) : null,
          updates.category,
          updates.categoryId,
          updates.confidentiality,
          updates.validityDays,
          nextStatus,
          now,
        ]
      );

      const updated = this.mapRow(result.rows[0]);

      await client.query(
        `
        INSERT INTO knowledge_item_versions (
          knowledge_item_id, version_number, title, description, content, category_id, tags, status,
          change_reason, affected_section, created_by, created_by_name, created_by_email
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
        `,
        [
          id,
          nextVersion,
          updated.title,
          updated.description,
          updated.content,
          updated.categoryId || null,
          JSON.stringify(updated.tags),
          updated.status,
          changeMeta?.changeReason || null,
          changeMeta?.affectedSection || null,
          author.id,
          author.name,
          author.email,
        ]
      );

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Atualiza apenas o status de um item (transições de workflow), sem criar nova versão.
   */
  async updateStatus(
    id: string,
    companyId: string,
    status: KnowledgeItem['status'],
    extra?: { approvedAt?: Date | null; expiresAt?: Date | null }
  ): Promise<KnowledgeItem | null> {
    const result = await db.query(
      `
      UPDATE knowledge_items
      SET status = $3,
          approved_at = COALESCE($4, approved_at),
          expires_at = COALESCE($5, expires_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING *;
      `,
      [id, companyId, status, extra?.approvedAt ?? null, extra?.expiresAt ?? null]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const query = 'DELETE FROM knowledge_items WHERE id = $1 AND company_id = $2;';
    const result = await db.query(query, [id, companyId]);
    return (result.rowCount ?? 0) > 0;
  }

  async list(companyId: string, limit = 50, offset = 0, restrictToVisible = false): Promise<KnowledgeItem[]> {
    const query = `
      SELECT * FROM knowledge_items
      WHERE company_id = $1 AND deleted_at IS NULL
      ${restrictToVisible ? VIEWER_STATUS_FILTER : ''}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await db.query(query, [companyId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Histórico de versões de um item (RF-03), mais recentes primeiro.
   */
  async listVersions(itemId: string, companyId: string): Promise<KnowledgeItemVersion[]> {
    const item = await this.findById(itemId, companyId);
    if (!item) return [];

    const result = await db.query(
      `
      SELECT * FROM knowledge_item_versions
      WHERE knowledge_item_id = $1
      ORDER BY version_number DESC;
      `,
      [itemId]
    );
    return result.rows.map(row => this.mapVersionRow(row));
  }

  /**
   * Restaura uma versão anterior como conteúdo atual, registrando uma nova versão (RF-03).
   */
  async restoreVersion(
    itemId: string,
    companyId: string,
    versionNumber: number,
    author: { id: string; name: string; email: string }
  ): Promise<KnowledgeItem | null> {
    const item = await this.findById(itemId, companyId);
    if (!item) return null;

    const versionResult = await db.query(
      'SELECT * FROM knowledge_item_versions WHERE knowledge_item_id = $1 AND version_number = $2;',
      [itemId, versionNumber]
    );
    if (versionResult.rows.length === 0) return null;
    const version = this.mapVersionRow(versionResult.rows[0]);

    return this.update(
      itemId,
      companyId,
      {
        title: version.title,
        description: version.description,
        content: version.content,
        tags: version.tags,
        categoryId: version.categoryId,
      },
      author,
      { changeReason: `Restauração da versão ${versionNumber}` }
    );
  }

  /**
   * Inicia o workflow de aprovação em 3 alçadas (RF004) para a versão mais recente.
   */
  async createApprovalWorkflow(itemId: string): Promise<KnowledgeItemApproval[]> {
    const versionResult = await db.query(
      'SELECT id FROM knowledge_item_versions WHERE knowledge_item_id = $1 ORDER BY version_number DESC LIMIT 1;',
      [itemId]
    );
    const versionId = versionResult.rows[0]?.id ?? null;

    const created: KnowledgeItemApproval[] = [];
    for (const { level, approverRole } of APPROVAL_LEVELS) {
      const result = await db.query(
        `
        INSERT INTO knowledge_item_approvals (knowledge_item_id, version_id, level, approver_role, status)
        VALUES ($1, $2, $3, $4, 'pending')
        ON CONFLICT (knowledge_item_id, version_id, level)
        DO UPDATE SET status = 'pending', justification = NULL, decided_by = NULL, decided_at = NULL
        RETURNING *;
        `,
        [itemId, versionId, level, approverRole]
      );
      created.push(this.mapApprovalRow(result.rows[0]));
    }
    return created;
  }

  async listApprovals(itemId: string): Promise<KnowledgeItemApproval[]> {
    const versionResult = await db.query(
      'SELECT id FROM knowledge_item_versions WHERE knowledge_item_id = $1 ORDER BY version_number DESC LIMIT 1;',
      [itemId]
    );
    const versionId = versionResult.rows[0]?.id ?? null;

    const result = await db.query(
      `
      SELECT * FROM knowledge_item_approvals
      WHERE knowledge_item_id = $1 AND version_id = $2
      ORDER BY level ASC;
      `,
      [itemId, versionId]
    );
    return result.rows.map(row => this.mapApprovalRow(row));
  }

  async getApproval(itemId: string, level: 1 | 2 | 3): Promise<KnowledgeItemApproval | null> {
    const versionResult = await db.query(
      'SELECT id FROM knowledge_item_versions WHERE knowledge_item_id = $1 ORDER BY version_number DESC LIMIT 1;',
      [itemId]
    );
    const versionId = versionResult.rows[0]?.id ?? null;

    const result = await db.query(
      `
      SELECT * FROM knowledge_item_approvals
      WHERE knowledge_item_id = $1 AND version_id = $2 AND level = $3;
      `,
      [itemId, versionId, level]
    );
    return result.rows.length > 0 ? this.mapApprovalRow(result.rows[0]) : null;
  }

  async recordApprovalDecision(
    approvalId: string,
    decision: ApprovalDecision,
    decidedBy: string,
    justification?: string
  ): Promise<KnowledgeItemApproval> {
    const result = await db.query(
      `
      UPDATE knowledge_item_approvals
      SET status = $2, justification = $3, decided_by = $4, decided_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
      `,
      [approvalId, decision, justification || null, decidedBy]
    );
    return this.mapApprovalRow(result.rows[0]);
  }

  /**
   * KPIs do dashboard (Total, Em Dia, Vencidos, Alerta) — seção 3.1 do SRS.
   */
  async getStats(companyId: string): Promise<KnowledgeStats> {
    const result = await db.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (
          WHERE status = 'published' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP + INTERVAL '30 days')
        ) AS current,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired,
        COUNT(*) FILTER (
          WHERE status = 'published' AND expires_at IS NOT NULL
            AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND expires_at > CURRENT_TIMESTAMP
        ) AS alert
      FROM knowledge_items
      WHERE company_id = $1 AND deleted_at IS NULL;
      `,
      [companyId]
    );
    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      current: parseInt(row.current, 10),
      expired: parseInt(row.expired, 10),
      alert: parseInt(row.alert, 10),
    };
  }

  /**
   * Itens publicados cuja validade já venceu (RF005) — uso pelo cron de expiração.
   */
  async findExpired(): Promise<KnowledgeItem[]> {
    const result = await db.query(
      `
      SELECT * FROM knowledge_items
      WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP AND deleted_at IS NULL;
      `
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Itens publicados que entram em uma das janelas de alerta (30/15/5 dias) e ainda não notificados (RF005).
   */
  async findExpiringAtMilestone(milestoneDays: number): Promise<KnowledgeItem[]> {
    const result = await db.query(
      `
      SELECT ki.* FROM knowledge_items ki
      WHERE ki.status = 'published' AND ki.deleted_at IS NULL
        AND ki.expires_at IS NOT NULL
        AND ki.expires_at::date = (CURRENT_DATE + $1::int)
        AND NOT EXISTS (
          SELECT 1 FROM knowledge_item_expiry_notifications n
          WHERE n.knowledge_item_id = ki.id AND n.milestone_days = $1
        );
      `,
      [milestoneDays]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  async markExpiryNotified(itemId: string, milestoneDays: number): Promise<void> {
    await db.query(
      `
      INSERT INTO knowledge_item_expiry_notifications (knowledge_item_id, milestone_days)
      VALUES ($1, $2)
      ON CONFLICT (knowledge_item_id, milestone_days) DO NOTHING;
      `,
      [itemId, milestoneDays]
    );
  }

  async markExpired(itemId: string, companyId: string): Promise<KnowledgeItem | null> {
    return this.updateStatus(itemId, companyId, 'expired');
  }

  private mapRow(row: any): KnowledgeItem {
    return {
      id: row.id,
      companyId: row.company_id,
      category: row.category,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      content: row.content,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      docType: row.doc_type,
      documentCode: row.document_code,
      towerId: row.tower_id,
      confidentiality: row.confidentiality,
      status: row.status,
      validityDays: row.validity_days,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapVersionRow(row: any): KnowledgeItemVersion {
    return {
      id: row.id,
      knowledgeItemId: row.knowledge_item_id,
      versionNumber: row.version_number,
      title: row.title,
      description: row.description,
      content: row.content,
      categoryId: row.category_id,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      status: row.status,
      changeReason: row.change_reason,
      affectedSection: row.affected_section,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdByEmail: row.created_by_email,
      createdAt: new Date(row.created_at),
    };
  }

  private mapApprovalRow(row: any): KnowledgeItemApproval {
    return {
      id: row.id,
      knowledgeItemId: row.knowledge_item_id,
      versionId: row.version_id,
      level: row.level,
      approverRole: row.approver_role,
      status: row.status,
      justification: row.justification,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at ? new Date(row.decided_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}

export const knowledgeRepository = new KnowledgeRepository();
