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
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  description?: string
  createdAt: string
}

export interface SystemAdmin {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'support'
}
