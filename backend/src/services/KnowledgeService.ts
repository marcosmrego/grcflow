import { knowledgeRepository } from '../repositories/KnowledgeRepository';
import { KnowledgeItem } from '../models/types';

export class KnowledgeService {
  async createItem(data: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    return knowledgeRepository.create(data);
  }

  async getItem(id: string): Promise<KnowledgeItem | null> {
    return knowledgeRepository.findById(id);
  }

  async getByCategory(category: string, limit?: number, offset?: number): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByCategory(category, limit, offset);
  }

  async searchItems(query: string): Promise<KnowledgeItem[]> {
    return knowledgeRepository.search(query);
  }

  async getByTag(tag: string): Promise<KnowledgeItem[]> {
    return knowledgeRepository.findByTag(tag);
  }

  async updateItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    return knowledgeRepository.update(id, updates);
  }

  async deleteItem(id: string): Promise<boolean> {
    return knowledgeRepository.delete(id);
  }

  async listItems(limit?: number, offset?: number): Promise<KnowledgeItem[]> {
    return knowledgeRepository.list(limit, offset);
  }
}

export const knowledgeService = new KnowledgeService();
