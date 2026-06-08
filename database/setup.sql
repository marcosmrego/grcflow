-- GRC Flow Database Setup Script
-- Execute conectado ao banco 'postgres' como superuser (psql -U postgres)

-- 1. Criar schema
CREATE SCHEMA IF NOT EXISTS grc_flow;

-- 2. Habilitar extensões (ficam no schema public por padrão)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 3. Definir search_path para esta sessão
SET search_path TO grc_flow, public;

-- 4. Criar tabelas

-- Usuários de sistema (equipe que opera a plataforma — fora do conceito de empresa)
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'support' CHECK (role IN ('super_admin', 'support')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Empresas (tenants): cada uma com seu próprio cadastro de usuários e dados isolados
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  document VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categories_company_name_unique UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tags_company_name_unique UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  next_steps JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes

CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);
CREATE INDEX IF NOT EXISTS idx_system_users_deleted_at ON system_users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_company_id ON knowledge_items(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_items(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_deleted_at ON knowledge_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_text ON knowledge_items
  USING GIN(to_tsvector('portuguese', title || ' ' || description || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_flows_company_id ON process_flows(company_id);
CREATE INDEX IF NOT EXISTS idx_flows_status ON process_flows(status);
CREATE INDEX IF NOT EXISTS idx_flows_deleted_at ON process_flows(deleted_at);

CREATE INDEX IF NOT EXISTS idx_steps_flow_id ON process_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_steps_order ON process_steps(flow_id, "order");

CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_company_id ON tags(company_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 6. Funções e triggers

CREATE OR REPLACE FUNCTION grc_flow.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION grc_flow.audit_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO grc_flow.audit_logs (
      company_id, entity_type, entity_id, action, user_id, user_email, old_values, new_values
    ) VALUES (
      NEW.company_id,
      TG_TABLE_NAME,
      NEW.id,
      'DELETE',
      NEW.deleted_by,
      (SELECT email FROM grc_flow.users WHERE id = NEW.deleted_by LIMIT 1),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_system_users_updated_at
  BEFORE UPDATE ON system_users
  FOR EACH ROW EXECUTE FUNCTION grc_flow.update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION grc_flow.update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_knowledge_items_updated_at
  BEFORE UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION grc_flow.update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_knowledge_items_audit_delete
  AFTER UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION grc_flow.audit_soft_delete();

CREATE OR REPLACE TRIGGER trigger_process_flows_updated_at
  BEFORE UPDATE ON process_flows
  FOR EACH ROW EXECUTE FUNCTION grc_flow.update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_process_flows_audit_delete
  AFTER UPDATE ON process_flows
  FOR EACH ROW EXECUTE FUNCTION grc_flow.audit_soft_delete();

CREATE OR REPLACE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION grc_flow.update_updated_at_column();

-- 7. Empresa padrão + admin inicial (senha: admin123 — troque em produção!)
INSERT INTO companies (name, is_active)
SELECT 'Empresa Demo', TRUE
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Empresa Demo');

INSERT INTO users (email, name, password_hash, role, is_active, company_id)
VALUES (
  'admin@grcflow.local',
  'Administrator',
  '$2a$10$6W7z5JOJhZB7nM8g4kW5pOqQqE3V0l2Y0r9q8M7n6P5o4K3j2H1i2',
  'admin',
  TRUE,
  (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;

-- 8. Usuário de sistema inicial — opera a plataforma (senha: admin123 — troque em produção!)
INSERT INTO system_users (email, name, password_hash, role, is_active)
VALUES (
  'platform-admin@grcflow.local',
  'Platform Administrator',
  '$2a$10$6W7z5JOJhZB7nM8g4kW5pOqQqE3V0l2Y0r9q8M7n6P5o4K3j2H1i2',
  'super_admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;
