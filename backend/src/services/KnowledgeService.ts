import { knowledgeRepository, APPROVAL_LEVELS } from '../repositories/KnowledgeRepository';
import { ApprovalDecision, KnowledgeItem, KnowledgeItemApproval, KnowledgeItemVersion, KnowledgeStats } from '../models/types';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

type Author = { id: string; name: string; email: string };

export class KnowledgeService {
  async createItem(
    data: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvedAt' | 'expiresAt'>,
    author: Author
  ): Promise<KnowledgeItem> {
    if (!knowledgeRepository.validateDocumentCode(data.docType, data.documentCode)) {
      throw new ValidationError(
        `Código identificador inválido para o tipo ${data.docType}. ` +
          `Use o formato ${data.docType}_AREA_CLIENTE_NUM (ex: ${data.docType}_GRC_ALFA_001).`,
        { field: 'documentCode' }
      );
    }
    return knowledgeRepository.create(data, author);
  }

  async getItem(id: string, companyId: string): Promise<KnowledgeItem | null> {
    return knowledgeRepository.findById(id, companyId);
  }

  async getByCategory(companyId: string, category: string, limit?: number, offset?: number): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByCategory(companyId, category, limit, offset);
  }

  async searchItems(companyId: string, query: string): Promise<KnowledgeItem[]> {
    return knowledgeRepository.search(companyId, query);
  }

  async getByTag(companyId: string, tag: string): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByTag(companyId, tag);
  }

  async updateItem(
    id: string,
    companyId: string,
    updates: Partial<
      Pick<
        KnowledgeItem,
        'title' | 'description' | 'content' | 'tags' | 'category' | 'categoryId' | 'documentCode' | 'confidentiality' | 'validityDays'
      >
    >,
    author: Author,
    changeMeta?: { changeReason?: string; affectedSection?: string }
  ): Promise<KnowledgeItem | null> {
    if (updates.documentCode !== undefined) {
      const item = await knowledgeRepository.findById(id, companyId);
      if (!item) return null;
      if (!knowledgeRepository.validateDocumentCode(item.docType, updates.documentCode)) {
        throw new ValidationError(
          `Código identificador inválido para o tipo ${item.docType}. ` +
            `Use o formato ${item.docType}_AREA_CLIENTE_NUM (ex: ${item.docType}_GRC_ALFA_001).`,
          { field: 'documentCode' }
        );
      }
    }
    return knowledgeRepository.update(id, companyId, updates, author, changeMeta);
  }

  async deleteItem(id: string, companyId: string): Promise<boolean> {
    return knowledgeRepository.delete(id, companyId);
  }

  async listItems(companyId: string, limit?: number, offset?: number): Promise<KnowledgeItem[]> {
    return knowledgeRepository.list(companyId, limit, offset);
  }

  async listVersions(id: string, companyId: string): Promise<KnowledgeItemVersion[]> {
    const item = await knowledgeRepository.findById(id, companyId);
    if (!item) throw new NotFoundError('KnowledgeItem', id);
    return knowledgeRepository.listVersions(id, companyId);
  }

  async restoreVersion(id: string, companyId: string, versionNumber: number, author: Author): Promise<KnowledgeItem> {
    const restored = await knowledgeRepository.restoreVersion(id, companyId, versionNumber, author);
    if (!restored) throw new NotFoundError('KnowledgeItem version', `${id}@${versionNumber}`);
    return restored;
  }

  /**
   * Envia o item para o workflow de aprovação em 3 alçadas (RF004).
   * Documentos do tipo ARTICLE também podem usar o fluxo, mas não é obrigatório.
   */
  async submitForApproval(id: string, companyId: string): Promise<{ item: KnowledgeItem; approvals: KnowledgeItemApproval[] }> {
    const item = await knowledgeRepository.findById(id, companyId);
    if (!item) throw new NotFoundError('KnowledgeItem', id);

    if (item.status !== 'draft' && item.status !== 'in_review') {
      throw new ConflictError(`Não é possível enviar para aprovação um item com status "${item.status}".`);
    }

    const approvals = await knowledgeRepository.createApprovalWorkflow(id);
    const updated = await knowledgeRepository.updateStatus(id, companyId, 'pending_approval');
    return { item: updated!, approvals };
  }

  async listApprovals(id: string, companyId: string): Promise<KnowledgeItemApproval[]> {
    const item = await knowledgeRepository.findById(id, companyId);
    if (!item) throw new NotFoundError('KnowledgeItem', id);
    return knowledgeRepository.listApprovals(id);
  }

  /**
   * Registra a decisão de uma alçada (RF004). Reprovação exige justificativa e devolve o
   * documento para "em revisão"; aprovação na última alçada publica o documento e inicia
   * a contagem de validade (365 dias por padrão).
   */
  async decideApproval(
    id: string,
    companyId: string,
    level: 1 | 2 | 3,
    decision: ApprovalDecision,
    decidedBy: string,
    justification?: string
  ): Promise<{ item: KnowledgeItem; approval: KnowledgeItemApproval }> {
    const item = await knowledgeRepository.findById(id, companyId);
    if (!item) throw new NotFoundError('KnowledgeItem', id);

    if (item.status !== 'pending_approval') {
      throw new ConflictError(`Item com status "${item.status}" não está aguardando aprovação.`);
    }

    if (decision === 'rejected' && !justification) {
      throw new ValidationError('Justificativa é obrigatória para reprovação.', { field: 'justification' });
    }

    const approval = await knowledgeRepository.getApproval(id, level);
    if (!approval) throw new NotFoundError('Approval', `${id}@level${level}`);
    if (approval.status !== 'pending') {
      throw new ConflictError(`Alçada de nível ${level} já foi decidida.`);
    }

    // Garante que as alçadas anteriores já foram aprovadas (ordem sequencial)
    const previousLevels = APPROVAL_LEVELS.filter(l => l.level < level);
    for (const { level: prevLevel } of previousLevels) {
      const prevApproval = await knowledgeRepository.getApproval(id, prevLevel as 1 | 2 | 3);
      if (!prevApproval || prevApproval.status !== 'approved') {
        throw new ConflictError(`A alçada de nível ${prevLevel} ainda não foi aprovada.`);
      }
    }

    const decided = await knowledgeRepository.recordApprovalDecision(approval.id, decision, decidedBy, justification);

    if (decision === 'rejected') {
      const updated = await knowledgeRepository.updateStatus(id, companyId, 'in_review');
      return { item: updated!, approval: decided };
    }

    const isFinalLevel = level === APPROVAL_LEVELS[APPROVAL_LEVELS.length - 1].level;
    if (isFinalLevel) {
      const approvedAt = new Date();
      const expiresAt = new Date(approvedAt);
      expiresAt.setDate(expiresAt.getDate() + item.validityDays);
      const updated = await knowledgeRepository.updateStatus(id, companyId, 'published', { approvedAt, expiresAt });
      return { item: updated!, approval: decided };
    }

    // Aprovação intermediária: status permanece pending_approval até a última alçada
    return { item, approval: decided };
  }

  async getStats(companyId: string): Promise<KnowledgeStats> {
    return knowledgeRepository.getStats(companyId);
  }
}

export const knowledgeService = new KnowledgeService();
