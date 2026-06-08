import { processFlowRepository } from '../repositories/ProcessFlowRepository';
import { ProcessFlow, ProcessStep } from '../models/types';
import { NotFoundError } from '../middleware';

export class ProcessFlowService {
  async createFlow(data: Omit<ProcessFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessFlow> {
    return processFlowRepository.create(data);
  }

  async getFlow(id: string, companyId: string): Promise<ProcessFlow | null> {
    return processFlowRepository.findById(id, companyId);
  }

  async listFlows(companyId: string, status?: string): Promise<ProcessFlow[]> {
    return processFlowRepository.list(companyId, status);
  }

  async addStepToFlow(companyId: string, step: Omit<ProcessStep, 'id'>): Promise<ProcessStep> {
    const belongs = await processFlowRepository.belongsToCompany(step.flowId, companyId);
    if (!belongs) {
      throw new NotFoundError('Process flow not found');
    }

    return processFlowRepository.addStep(step);
  }

  async updateFlow(id: string, companyId: string, updates: Partial<ProcessFlow>): Promise<ProcessFlow | null> {
    return processFlowRepository.updateFlow(id, companyId, updates);
  }

  async deleteFlow(id: string, companyId: string): Promise<boolean> {
    return processFlowRepository.delete(id, companyId);
  }

  // Future: AI-powered flow generation
  async generateFlowFromKnowledge(knowledgeId: string): Promise<ProcessFlow | null> {
    // This will be implemented with OpenAI integration
    console.log(`Generating flow from knowledge item: ${knowledgeId}`);
    return null;
  }
}

export const processFlowService = new ProcessFlowService();
