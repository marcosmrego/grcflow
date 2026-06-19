import { leadRepository } from '../repositories/LeadRepository';
import { Lead } from '../models/types';

interface CreateLeadInput {
  name: string;
  email: string;
  companyName?: string;
  phone?: string;
  message?: string;
  source?: string;
}

/**
 * Lead Service
 * Leads captured by the public marketing landing page (no SMTP/CRM integration yet —
 * leads are only visible through the platform admin panel, GET /api/leads).
 */
export class LeadService {
  async create(input: CreateLeadInput): Promise<Lead> {
    return leadRepository.create(input);
  }

  async list(limit: number, offset: number, search?: string): Promise<{ leads: Lead[]; total: number }> {
    return leadRepository.list(limit, offset, search);
  }

  async delete(id: string): Promise<void> {
    return leadRepository.delete(id);
  }
}

export const leadService = new LeadService();
