import { knowledgeRepository, APPROVAL_LEVELS } from '../repositories/KnowledgeRepository';
import { userRepository } from '../repositories/UserRepository';
import { companyRepository } from '../repositories/CompanyRepository';
import { ApprovalDecision, KnowledgeItem, KnowledgeItemApproval, KnowledgeItemVersion, KnowledgeStats, UserRole } from '../models/types';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

type Author = { id: string; name: string; email: string };

// Documentos ainda não aprovados só são visíveis para quem participa do workflow (admin/editor).
const VIEWER_HIDDEN_STATUSES: KnowledgeItem['status'][] = ['draft', 'in_review', 'pending_approval'];

export class KnowledgeService {
  async createItem(
    data: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvedAt' | 'expiresAt' | 'documentCode'>,
    author: Author
  ): Promise<KnowledgeItem> {
    return knowledgeRepository.create(data, author);
  }

  async getItem(id: string, companyId: string, role?: UserRole): Promise<KnowledgeItem | null> {
    const item = await knowledgeRepository.findById(id, companyId);
    if (item && role === 'viewer' && VIEWER_HIDDEN_STATUSES.includes(item.status)) return null;
    return item;
  }

  async getByCategory(companyId: string, category: string, limit?: number, offset?: number, role?: UserRole): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByCategory(companyId, category, limit, offset, role === 'viewer');
  }

  async searchItems(companyId: string, query: string, role?: UserRole): Promise<KnowledgeItem[]> {
    return knowledgeRepository.search(companyId, query, role === 'viewer');
  }

  async getByTag(companyId: string, tag: string, role?: UserRole): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByTag(companyId, tag, role === 'viewer');
  }

  async updateItem(
    id: string,
    companyId: string,
    updates: Partial<
      Pick<
        KnowledgeItem,
        'title' | 'description' | 'content' | 'tags' | 'category' | 'categoryId' | 'confidentiality' | 'validityDays'
      >
    >,
    author: Author,
    changeMeta?: { changeReason?: string; affectedSection?: string }
  ): Promise<KnowledgeItem | null> {
    return knowledgeRepository.update(id, companyId, updates, author, changeMeta);
  }

  async deleteItem(id: string, companyId: string): Promise<boolean> {
    return knowledgeRepository.delete(id, companyId);
  }

  async listItems(companyId: string, limit?: number, offset?: number, role?: UserRole): Promise<KnowledgeItem[]> {
    return knowledgeRepository.list(companyId, limit, offset, role === 'viewer');
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

    // Só admin (acesso irrestrito) ou quem está no grupo de aprovação daquela alçada
    // pode decidir essa etapa (RF004 — combinado com Thiago em 17/06/2026). Na empresa de
    // demonstração pública (is_demo) essa segregação não se aplica — é um sandbox, não um
    // ambiente real, e o visitante precisa poder testar as 3 alçadas numa única conta.
    const decidingUser = await userRepository.findByIdInCompany(decidedBy, companyId);
    if (!decidingUser) throw new NotFoundError('User', decidedBy);

    const company = await companyRepository.findById(companyId);
    const isDemoSandbox = !!company?.is_demo;

    if (!isDemoSandbox && decidingUser.role !== 'admin' && decidingUser.approval_group !== approval.approverRole) {
      throw new AuthorizationError(
        `Apenas usuários do grupo de aprovação "${approval.approverRole}" podem decidir esta alçada.`
      );
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
