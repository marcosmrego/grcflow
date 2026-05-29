import { processFlowRepository } from '../repositories/ProcessFlowRepository';
import { ProcessFlow, ProcessStep } from '../models/types';

export class ProcessFlowService {
  async createFlow(data: Omit<ProcessFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessFlow> {
    return processFlowRepository.create(data);
  }

  async getFlow(id: string): Promise<ProcessFlow | null> {
    return processFlowRepository.findById(id);
  }

  async listFlows(status?: string): Promise<ProcessFlow[]> {
    return processFlowRepository.list(status);
  }

  async addStepToFlow(step: Omit<ProcessStep, 'id'>): Promise<ProcessStep> {
    return processFlowRepository.addStep(step);
  }

  async updateFlow(id: string, updates: Partial<ProcessFlow>): Promise<ProcessFlow | null> {
    return processFlowRepository.updateFlow(id, updates);
  }

  async deleteFlow(id: string): Promise<boolean> {
    return processFlowRepository.delete(id);
  }

  // Future: AI-powered flow generation
  async generateFlowFromKnowledge(knowledgeId: string): Promise<ProcessFlow | null> {
    // This will be implemented with OpenAI integration
    console.log(`Generating flow from knowledge item: ${knowledgeId}`);
    return null;
  }
}

export const processFlowService = new ProcessFlowService();
