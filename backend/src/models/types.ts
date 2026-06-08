export interface KnowledgeItem {
  id: string;
  companyId: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
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

export interface User {
  id: string;
  company_id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
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
}

export interface SystemJWTPayload {
  sub: string; // system user id
  email: string;
  role: SystemUserRole;
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
