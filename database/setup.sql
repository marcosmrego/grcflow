-- GRC Flow Database Setup Script
-- Execute este script como superuser ou como o user postgres

-- 1. Create user and database
CREATE USER grc_user WITH PASSWORD 'your_password_here';
CREATE DATABASE grc_flow OWNER grc_user;

-- 2. Connect to the database
\c grc_flow

-- 3. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- 4. Create tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(7),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5. Create indexes

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(entity_type, created_at DESC);

CREATE INDEX idx_knowledge_category ON knowledge_items(category);
CREATE INDEX idx_knowledge_created_at ON knowledge_items(created_at);
CREATE INDEX idx_knowledge_created_by ON knowledge_items(created_by);
CREATE INDEX idx_knowledge_deleted_at ON knowledge_items(deleted_at);
CREATE INDEX idx_knowledge_status ON knowledge_items(status);
CREATE INDEX idx_knowledge_tags ON knowledge_items USING GIN(tags);
CREATE INDEX idx_knowledge_text ON knowledge_items USING GIN(to_tsvector('portuguese', title || ' ' || description || ' ' || content));

CREATE INDEX idx_flows_status ON process_flows(status);
CREATE INDEX idx_flows_created_at ON process_flows(created_at);
CREATE INDEX idx_flows_created_by ON process_flows(created_by);
CREATE INDEX idx_flows_deleted_at ON process_flows(deleted_at);

CREATE INDEX idx_steps_flow_id ON process_steps(flow_id);
CREATE INDEX idx_steps_order ON process_steps(flow_id, "order");

CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE INDEX idx_tags_name ON tags(name);

-- 6. Create functions for triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-log deletions as soft delete
CREATE OR REPLACE FUNCTION audit_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO audit_logs (
      entity_type, 
      entity_id, 
      action, 
      user_id, 
      user_email,
      old_values,
      new_values
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'DELETE',
      NEW.deleted_by,
      (SELECT email FROM users WHERE id = NEW.deleted_by LIMIT 1),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers

-- Update updated_at on knowledge_items
CREATE TRIGGER trigger_knowledge_items_updated_at
BEFORE UPDATE ON knowledge_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit soft delete on knowledge_items
CREATE TRIGGER trigger_knowledge_items_audit_delete
AFTER UPDATE ON knowledge_items
FOR EACH ROW
EXECUTE FUNCTION audit_soft_delete();

-- Update updated_at on process_flows
CREATE TRIGGER trigger_process_flows_updated_at
BEFORE UPDATE ON process_flows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit soft delete on process_flows
CREATE TRIGGER trigger_process_flows_audit_delete
AFTER UPDATE ON process_flows
FOR EACH ROW
EXECUTE FUNCTION audit_soft_delete();

-- Update updated_at on users
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 8. Create initial admin user (password: admin123, change in production!)
INSERT INTO users (email, name, password_hash, role, is_active)
VALUES (
  'admin@grc-flow.local',
  'Administrator',
  '$2a$10$6W7z5JOJhZB7nM8g4kW5pOqQqE3V0l2Y0r9q8M7n6P5o4K3j2H1i2',
  'admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 7. Grant permissions
GRANT ALL PRIVILEGES ON DATABASE grc_flow TO grc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO grc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO grc_user;

-- 7. Set search_path
ALTER ROLE grc_user SET search_path = public;
