import { adminApiRequest } from './client'
import type { Company, Invoice, User } from '../../types'

type RawCompany = Omit<Company, 'isActive' | 'createdAt'> & { is_active: boolean; created_at: string }

function normalizeCompany(raw: RawCompany): Company {
  return { ...raw, isActive: raw.is_active, createdAt: raw.created_at }
}

export async function getCompanies(page = 1, limit = 50, search = ''): Promise<{ items: Company[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
  const s = search ? `&search=${encodeURIComponent(search)}` : ''
  const res = await adminApiRequest<{ items: RawCompany[]; pagination: { total: number; page: number; pages: number; limit: number } }>(`/companies?page=${page}&limit=${limit}${s}`)
  return { ...res, items: res.items.map(normalizeCompany) }
}

export async function getCompany(id: string): Promise<Company> {
  return adminApiRequest(`/companies/${id}`)
}

export async function createCompany(data: { name: string; slug: string }): Promise<Company> {
  return adminApiRequest('/companies', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  return adminApiRequest(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteCompany(id: string): Promise<void> {
  return adminApiRequest(`/companies/${id}`, { method: 'DELETE' })
}

export async function getCompanyUsers(companyId: string, page = 1, limit = 50): Promise<{ data: User[]; total: number }> {
  return adminApiRequest(`/companies/${companyId}/users?page=${page}&limit=${limit}`)
}

export async function createCompanyAdmin(companyId: string, data: { name: string; email: string; password: string }): Promise<User> {
  return adminApiRequest(`/companies/${companyId}/admin-user`, { method: 'POST', body: JSON.stringify(data) })
}

export async function getCompanyModules(companyId: string): Promise<{ data: Array<{ key: string; name: string; isActive: boolean }> }> {
  return adminApiRequest(`/companies/${companyId}/modules`)
}

export async function setCompanyModule(companyId: string, moduleKey: string, data: { isActive: boolean }): Promise<void> {
  return adminApiRequest(`/companies/${companyId}/modules/${moduleKey}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function getCompanyInvoices(companyId: string): Promise<{ data: Invoice[] }> {
  return adminApiRequest(`/companies/${companyId}/invoices`)
}

export async function createCompanyInvoice(companyId: string, data: Partial<Invoice>): Promise<Invoice> {
  return adminApiRequest(`/companies/${companyId}/invoices`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCompanyInvoice(companyId: string, invoiceId: string, data: Partial<Invoice>): Promise<Invoice> {
  return adminApiRequest(`/companies/${companyId}/invoices/${invoiceId}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteCompanyInvoice(companyId: string, invoiceId: string): Promise<void> {
  return adminApiRequest(`/companies/${companyId}/invoices/${invoiceId}`, { method: 'DELETE' })
}

export async function getLeads(page = 1, limit = 50, search = ''): Promise<{ items: Array<{ id: string; name: string; email: string; companyName?: string; phone?: string; message?: string; source?: string; createdAt: string }>; pagination: { total: number; page: number; pages: number; limit: number } }> {
  const s = search ? `&search=${encodeURIComponent(search)}` : ''
  return adminApiRequest(`/leads?page=${page}&limit=${limit}${s}`)
}

export async function deleteLead(id: string): Promise<void> {
  return adminApiRequest(`/leads/${id}`, { method: 'DELETE' })
}
