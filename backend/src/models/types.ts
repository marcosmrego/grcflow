export type DocType = 'ARTICLE' | 'POL' | 'POP' | 'IOP' | 'FOR' | 'FLU';

export type KnowledgeItemStatus =
  | 'draft'
  | 'in_review'
  | 'pending_approval'
  | 'published'
  | 'expired'
  | 'archived';

export type Confidentiality = 'publico' | 'interno' | 'restrito' | 'confidencial';

export interface KnowledgeItem {
  id: string;
  companyId: string;
  category: string;
  categoryId?: string | null;
  title: string;
  description: string;
  content: string;
  tags: string[];
  docType: DocType;
  documentCode?: string | null;
  towerId?: string | null;
  confidentiality: Confidentiality;
  status: KnowledgeItemStatus;
  validityDays: number;
  approvedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Cadastro de torres/departamentos (RF002): gera e numera o código do documento
// automaticamente por torre + tipo de documento (ex: POP_HD_001).
export interface Tower {
  id: string;
  companyId: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeItemVersion {
  id: string;
  knowledgeItemId: string;
  versionNumber: number;
  title: string;
  description: string;
  content: string;
  categoryId?: string | null;
  tags: string[];
  status: KnowledgeItemStatus;
  changeReason?: string | null;
  affectedSection?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  createdAt: Date;
}

export type ApprovalDecision = 'pending' | 'approved' | 'rejected';

export interface KnowledgeItemApproval {
  id: string;
  knowledgeItemId: string;
  versionId?: string | null;
  level: 1 | 2 | 3;
  approverRole: string;
  status: ApprovalDecision;
  justification?: string | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  createdAt: Date;
}

export interface KnowledgeStats {
  total: number;
  current: number;
  expired: number;
  alert: number;
}

export interface ProcessFlow {
  id: string;
  companyId: string;
  name: string;
  description: string;
  steps: ProcessStep[];
  metadata: Record<string, any>;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessStep {
  id: string;
  flowId: string;
  order: number;
  title: string;
  description: string;
  type: 'action' | 'decision' | 'wait' | 'notification';
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  nextSteps?: string[]; // IDs of next steps
}

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// ============= COMPANIES (TENANTS) =============

export interface Company {
  id: string;
  name: string;
  document?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// ============= AUTHENTICATION & AUTHORIZATION =============

export type UserRole = 'admin' | 'editor' | 'viewer';

// Alçada de aprovação (RF004) que o usuário está autorizado a decidir no workflow de
// 3 níveis da Base de Conhecimento. Sem relação com `role` — um editor só pode aprovar
// a alçada do seu grupo; admin aprova qualquer alçada independente do grupo.
export type ApprovalGroup = 'technical' | 'compliance' | 'final';

export interface User {
  id: string;
  company_id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  approval_group?: ApprovalGroup | null;
  is_active: boolean;
  // Acesso a funcionalidades exclusivas, além das permissões normais do role. Não pode ser
  // setada via API (CRUD de usuários) — apenas manualmente, para evitar autopromoção.
  is_master?: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface UserPayload {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: UserRole;
  isMaster: boolean;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  sub: string; // user id
  companyId: string;
  email: string;
  role: UserRole;
  isMaster: boolean;
  iat: number;
  exp: number;
}

// ============= SYSTEM USERS (PLATFORM OPERATORS) =============

export type SystemUserRole = 'super_admin' | 'support';

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: SystemUserRole;
  is_active: boolean;
  is_master?: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface SystemUserPayload {
  id: string;
  email: string;
  name: string;
  role: SystemUserRole;
  isMaster: boolean;
}

export interface SystemJWTPayload {
  sub: string; // system user id
  email: string;
  role: SystemUserRole;
  isMaster: boolean;
  iat: number;
  exp: number;
}

export type Permission = 
  | 'CREATE_KNOWLEDGE' | 'READ_KNOWLEDGE' | 'UPDATE_KNOWLEDGE' | 'DELETE_KNOWLEDGE'
  | 'CREATE_FLOW' | 'READ_FLOW' | 'UPDATE_FLOW' | 'DELETE_FLOW' | 'EXECUTE_FLOW'
  | 'MANAGE_USERS' | 'MANAGE_ROLES' | 'VIEW_AUDIT_LOGS';

export interface RolePermissions {
  admin: Permission[];
  editor: Permission[];
  viewer: Permission[];
}

// ============= AUDIT & LOGGING =============

export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  company_id?: string; // null for platform-level actions performed by system_users
  entity_type: string; // 'knowledge_items', 'process_flows', 'users', etc
  entity_id: string;
  action: AuditAction;
  user_id: string;
  user_email: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// ============= API RESPONSES =============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
