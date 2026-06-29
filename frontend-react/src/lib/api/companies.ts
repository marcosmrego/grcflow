import { adminApiRequest } from './client'
import type { BillingInvoice, BillingOverview, Company, Invoice, User } from '../../types'

type RawCompany = Omit<Company, 'isActive' | 'createdAt' | 'slug'> & { is_active: boolean; created_at: string; slug?: string }

function normalizeCompany(raw: RawCompany): Company {
  return { ...raw, slug: raw.slug ?? '', isActive: raw.is_active, createdAt: raw.created_at }
}

export async function getCompanies(page = 1, limit = 50, search = ''): Promise<{ items: Company[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
  const s = search ? `&search=${encodeURIComponent(search)}` : ''
  const res = await adminApiRequest<{ items: RawCompany[]; pagination: { total: number; page: number; pages: number; limit: number } }>(`/companies?page=${page}&limit=${limit}${s}`)
  return { ...res, items: res.items.map(normalizeCompany) }
}

export async function getCompany(id: string): Promise<Company> {
  const raw = await adminApiRequest<RawCompany>(`/companies/${id}`)
  return normalizeCompany(raw)
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

type RawUser = Omit<User, 'isActive' | 'createdAt'> & { is_active: boolean; created_at: string }

function normalizeUser(raw: RawUser): User {
  return { ...raw, isActive: raw.is_active, createdAt: raw.created_at }
}

export async function getCompanyUsers(companyId: string, page = 1, limit = 50): Promise<{ items: User[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
  const res = await adminApiRequest<{ items: RawUser[]; pagination: { total: number; page: number; pages: number; limit: number } }>(`/companies/${companyId}/users?page=${page}&limit=${limit}`)
  return { ...res, items: res.items.map(normalizeUser) }
}

export async function createCompanyAdmin(companyId: string, data: { name: string; email: string; password: string }): Promise<User> {
  return adminApiRequest(`/companies/${companyId}/admin-user`, { method: 'POST', body: JSON.stringify(data) })
}

export async function getCompanyModules(companyId: string): Promise<Array<{ moduleKey: string; name: string; description?: string; isActive: boolean }>> {
  return adminApiRequest(`/companies/${companyId}/modules`)
}

export async function setCompanyModule(companyId: string, moduleKey: string, data: { isActive: boolean }): Promise<void> {
  return adminApiRequest(`/companies/${companyId}/modules/${moduleKey}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function getCompanyInvoices(companyId: string): Promise<Invoice[]> {
  return adminApiRequest(`/companies/${companyId}/invoices`)
}

export async function createCompanyInvoice(
  companyId: string,
  data: { referenceMonth: string; amount: number; dueDate: string; notes?: string }
): Promise<Invoice> {
  return adminApiRequest(`/companies/${companyId}/invoices`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCompanyInvoice(
  companyId: string,
  invoiceId: string,
  data: { status?: 'pending' | 'paid' | 'cancelled'; amount?: number; dueDate?: string; notes?: string }
): Promise<Invoice> {
  return adminApiRequest(`/companies/${companyId}/invoices/${invoiceId}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function getBillingOverview(): Promise<BillingOverview> {
  return adminApiRequest('/system/billing/overview')
}

export async function getBillingInvoices(params?: {
  status?: string
  companyId?: string
  page?: number
  limit?: number
}): Promise<{ items: BillingInvoice[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.companyId) q.set('companyId', params.companyId)
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString() ? `?${q.toString()}` : ''
  return adminApiRequest(`/system/billing/invoices${qs}`)
}

export async function generateMonthlyInvoice(companyId: string, referenceMonth?: string): Promise<Invoice> {
  return adminApiRequest(`/system/billing/companies/${companyId}/invoices/generate`, {
    method: 'POST',
    body: JSON.stringify(referenceMonth ? { referenceMonth } : {}),
  })
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
