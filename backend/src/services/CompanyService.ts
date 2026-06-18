import { v4 as uuidv4 } from 'uuid';
import { companyRepository } from '../repositories/CompanyRepository';
import { companyModuleRepository } from '../repositories/CompanyModuleRepository';
import { companyInvoiceRepository } from '../repositories/CompanyInvoiceRepository';
import { Company, CompanyModule, CompanyInvoice, InvoiceStatus } from '../models/types';
import { ValidationError, NotFoundError, ConflictError } from '../middleware';

interface CommercialFields {
  legalName?: string;
  segment?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  monthlyFee?: number | null;
  notes?: string;
}

/**
 * Company Service
 * Manages tenant companies. Used exclusively by system (platform) users.
 */
export class CompanyService {
  async createCompany(data: { name: string; document?: string } & CommercialFields, createdBy: string): Promise<Company> {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Company name is required');
    }

    const nameExists = await companyRepository.nameExists(data.name.trim());
    if (nameExists) {
      throw new ConflictError('A company with this name already exists');
    }

    const company = await companyRepository.create({
      id: uuidv4(),
      name: data.name.trim(),
      document: data.document?.trim(),
      is_active: true,
      created_by: createdBy,
      legal_name: data.legalName?.trim(),
      segment: data.segment?.trim(),
      website: data.website?.trim(),
      contact_name: data.contactName?.trim(),
      contact_email: data.contactEmail?.trim(),
      contact_phone: data.contactPhone?.trim(),
      address: data.address?.trim(),
      city: data.city?.trim(),
      state: data.state?.trim(),
      zip_code: data.zipCode?.trim(),
      monthly_fee: data.monthlyFee ?? null,
      notes: data.notes?.trim(),
    });

    // Toda empresa nova já nasce com uma linha (inativa) por módulo do catálogo, pra UI
    // sempre ter o que exibir/alternar em vez de depender de "linha ausente = inativo".
    await companyModuleRepository.initializeForCompany(company.id);

    return company;
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

  async updateCompany(
    id: string,
    updates: { name?: string; document?: string; is_active?: boolean } & CommercialFields,
    updatedBy: string
  ): Promise<Company> {
    const company = await companyRepository.update(id, {
      name: updates.name?.trim(),
      document: updates.document?.trim(),
      is_active: updates.is_active,
      legal_name: updates.legalName?.trim(),
      segment: updates.segment?.trim(),
      website: updates.website?.trim(),
      contact_name: updates.contactName?.trim(),
      contact_email: updates.contactEmail?.trim(),
      contact_phone: updates.contactPhone?.trim(),
      address: updates.address?.trim(),
      city: updates.city?.trim(),
      state: updates.state?.trim(),
      zip_code: updates.zipCode?.trim(),
      monthly_fee: updates.monthlyFee,
      notes: updates.notes?.trim(),
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

  // ============= MÓDULOS =============

  async listModules(companyId: string): Promise<CompanyModule[]> {
    await this.getCompany(companyId);
    return companyModuleRepository.listForCompany(companyId);
  }

  async setModule(
    companyId: string,
    moduleKey: string,
    updates: { isActive?: boolean; price?: number | null }
  ): Promise<CompanyModule> {
    await this.getCompany(companyId);
    const module = await companyModuleRepository.setForCompany(companyId, moduleKey, updates);
    if (!module) {
      throw new NotFoundError('Module not found in catalog');
    }
    return module;
  }

  // ============= FATURAMENTO =============

  async listInvoices(companyId: string): Promise<CompanyInvoice[]> {
    await this.getCompany(companyId);
    return companyInvoiceRepository.listForCompany(companyId);
  }

  async createInvoice(
    companyId: string,
    data: { referenceMonth: string; amount: number; dueDate: string; notes?: string }
  ): Promise<CompanyInvoice> {
    await this.getCompany(companyId);

    if (!data.referenceMonth || !data.dueDate) {
      throw new ValidationError('referenceMonth and dueDate are required');
    }
    if (data.amount === undefined || data.amount === null || data.amount < 0) {
      throw new ValidationError('amount must be a non-negative number');
    }

    try {
      return await companyInvoiceRepository.create(companyId, {
        referenceMonth: new Date(data.referenceMonth),
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        notes: data.notes?.trim(),
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictError('Já existe uma cobrança para este mês de referência.');
      }
      throw err;
    }
  }

  async updateInvoice(
    companyId: string,
    invoiceId: string,
    updates: { amount?: number; dueDate?: string; status?: InvoiceStatus; notes?: string }
  ): Promise<CompanyInvoice> {
    await this.getCompany(companyId);
    const invoice = await companyInvoiceRepository.update(invoiceId, companyId, {
      amount: updates.amount,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      status: updates.status,
      notes: updates.notes?.trim(),
    });
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }
    return invoice;
  }

  async deleteInvoice(companyId: string, invoiceId: string): Promise<void> {
    await this.getCompany(companyId);
    const deleted = await companyInvoiceRepository.delete(invoiceId, companyId);
    if (!deleted) {
      throw new NotFoundError('Invoice not found');
    }
  }
}

export const companyService = new CompanyService();
