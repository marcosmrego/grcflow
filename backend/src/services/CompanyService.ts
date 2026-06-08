import { v4 as uuidv4 } from 'uuid';
import { companyRepository } from '../repositories/CompanyRepository';
import { Company } from '../models/types';
import { ValidationError, NotFoundError, ConflictError } from '../middleware';

/**
 * Company Service
 * Manages tenant companies. Used exclusively by system (platform) users.
 */
export class CompanyService {
  async createCompany(data: { name: string; document?: string }, createdBy: string): Promise<Company> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Company name is required');
    }

    const nameExists = await companyRepository.nameExists(data.name.trim());
    if (nameExists) {
      throw new ConflictError('A company with this name already exists');
    }

    return companyRepository.create({
      id: uuidv4(),
      name: data.name.trim(),
      document: data.document?.trim(),
      is_active: true,
      created_by: createdBy,
    });
  }

  async getCompany(id: string): Promise<Company> {
    const company = await companyRepository.findById(id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return company;
  }

  async listCompanies(limit: number = 20, offset: number = 0): Promise<{ companies: Company[]; total: number }> {
    return companyRepository.list(limit, offset);
  }

  async updateCompany(id: string, updates: { name?: string; document?: string; is_active?: boolean }, updatedBy: string): Promise<Company> {
    const company = await companyRepository.update(id, {
      name: updates.name?.trim(),
      document: updates.document?.trim(),
      is_active: updates.is_active,
      updated_by: updatedBy,
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  async deleteCompany(id: string, deletedBy: string): Promise<void> {
    const company = await companyRepository.findById(id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    await companyRepository.softDelete(id, deletedBy);
  }
}

export const companyService = new CompanyService();
