export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  companyId: string
  approvalGroup?: 'technical' | 'compliance' | 'final'
  isActive: boolean
  isDemo?: boolean
  createdAt: string
}

export interface AuthState {
  accessToken: string
  refreshToken?: string
  user: User
  isMaster?: boolean
}

export interface Company {
  id: string
  name: string
  slug: string
  isActive: boolean
  modules: Module[]
  createdAt: string
  document?: string | null
  legalName?: string | null
  segment?: string | null
  website?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  monthlyFee?: number | null
  notes?: string | null
}

export interface Module {
  key: string
  name: string
  isActive: boolean
}

export interface KnowledgeItem {
  id: string
  companyId: string
  category: string
  categoryId?: string
  title: string
  description?: string
  content?: string
  tags: string[]
  docType: 'ARTICLE' | 'POL' | 'POP' | 'IOP' | 'FOR' | 'FLU'
  towerId?: string
  confidentiality: 'publico' | 'interno' | 'restrito' | 'confidencial'
  validityDays: number
  status: 'draft' | 'published' | 'archived' | 'in_review' | 'pending_approval' | 'expired'
  createdAt: string
  updatedAt: string
  createdByName?: string
  createdByEmail?: string
}

export interface KnowledgeStats {
  total: number
  current: number
  alert: number
  expired: number
}

export interface Flow {
  id: string
  companyId: string
  name: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  steps: FlowStep[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface FlowStep {
  id: string
  flowId: string
  order: number
  title: string
  description?: string
  type: 'action' | 'decision' | 'wait' | 'notification'
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  nextSteps?: string[]
}

export interface Tower {
  id: string
  companyId: string
  name: string
  abbreviation: string
  isActive: boolean
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { message: string }
}

export interface Lead {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  message?: string
  createdAt: string
}

export interface Invoice {
  id: string
  companyId: string
  referenceMonth: string
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'cancelled'
  displayStatus: 'pending' | 'paid' | 'cancelled' | 'overdue'
  paidAt?: string | null
  sentAt?: string | null
  notes?: string | null
  createdAt: string
}

export interface BillingInvoice extends Invoice {
  companyName: string
}

export interface InvoiceActionLog {
  id: string
  invoiceId: string
  companyId: string
  action: string
  performedByName?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface BillingOverview {
  mrr: number
  pendingAmount: number
  overdueAmount: number
  overdueCount: number
  upcomingCount: number
}

export interface SystemAdmin {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'support'
}
