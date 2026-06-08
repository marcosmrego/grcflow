import { knowledgeRepository } from '../repositories/KnowledgeRepository';
import { KnowledgeItem } from '../models/types';

export class KnowledgeService {
  async createItem(data: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    return knowledgeRepository.create(data);
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

  async updateItem(id: string, companyId: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    return knowledgeRepository.update(id, companyId, updates);
  }

  async deleteItem(id: string, companyId: string): Promise<boolean> {
    return knowledgeRepository.delete(id, companyId);
  }

  async listItems(companyId: string, limit?: number, offset?: number): Promise<KnowledgeItem[]> {
    return knowledgeRepository.list(companyId, limit, offset);
  }
}

export const knowledgeService = new KnowledgeService();
