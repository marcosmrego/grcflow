import { db } from '../config/database';
import { config } from '../config';

const schema = config.database.schema;

const migrations = [
  `CREATE SCHEMA IF NOT EXISTS ${schema};`,
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE EXTENSION IF NOT EXISTS "pg_trgm";`,

  // users
  `
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
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
  `,

  // system_users — usuários da plataforma (equipe que opera o GRC Flow, fora do conceito de empresa)
  `
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
  CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
  CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);
  CREATE INDEX IF NOT EXISTS idx_system_users_deleted_at ON system_users(deleted_at);
  `,

  // companies — empresas (tenants); cada uma tem seu próprio cadastro de usuários e dados isolados
  `
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
  CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
  CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
  CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);
  `,

  // audit_logs
  `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE','READ','UPDATE','DELETE')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `,

  // categories
  `
  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
  `,

  // tags
  `
  CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `,

  // knowledge_items
  `
  CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_items(category);
  CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status);
  CREATE INDEX IF NOT EXISTS idx_knowledge_deleted_at ON knowledge_items(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_items USING GIN(tags);
  `,

  // process_flows
  `
  CREATE TABLE IF NOT EXISTS process_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_flows_status ON process_flows(status);
  CREATE INDEX IF NOT EXISTS idx_flows_deleted_at ON process_flows(deleted_at);
  `,

  // process_steps
  `
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
  CREATE INDEX IF NOT EXISTS idx_steps_flow_id ON process_steps(flow_id);
  CREATE INDEX IF NOT EXISTS idx_steps_order ON process_steps(flow_id, "order");
  `,

  // Empresa padrão (necessária para vincular registros pré-existentes a uma empresa)
  `
  INSERT INTO companies (name, is_active)
  SELECT 'Empresa Demo', TRUE
  WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Empresa Demo');
  `,

  // Vincula tabelas de dados a uma empresa (multi-tenant): adiciona coluna, faz backfill
  // dos registros existentes para a empresa padrão e torna a coluna obrigatória.
  `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  UPDATE users SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1) WHERE company_id IS NULL;
  ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
  `,
  // Corrige bug pré-existente: UserRepository.softDelete grava deleted_by, mas a coluna nunca
  // existiu na tabela users (presente em companies/system_users desde o início).
  `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
  `,
  `
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  UPDATE knowledge_items SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1) WHERE company_id IS NULL;
  ALTER TABLE knowledge_items ALTER COLUMN company_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_knowledge_company_id ON knowledge_items(company_id);
  `,
  `
  ALTER TABLE process_flows ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  UPDATE process_flows SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1) WHERE company_id IS NULL;
  ALTER TABLE process_flows ALTER COLUMN company_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_flows_company_id ON process_flows(company_id);
  `,
  `
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  UPDATE categories SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1) WHERE company_id IS NULL;
  ALTER TABLE categories ALTER COLUMN company_id SET NOT NULL;
  -- Nome deixa de ser único globalmente e passa a ser único por empresa
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_company_name_unique;
  ALTER TABLE categories ADD CONSTRAINT categories_company_name_unique UNIQUE (company_id, name);
  CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories(company_id);
  `,
  `
  ALTER TABLE tags ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  UPDATE tags SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1) WHERE company_id IS NULL;
  ALTER TABLE tags ALTER COLUMN company_id SET NOT NULL;
  -- Nome deixa de ser único globalmente e passa a ser único por empresa
  ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
  ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_company_name_unique;
  ALTER TABLE tags ADD CONSTRAINT tags_company_name_unique UNIQUE (company_id, name);
  CREATE INDEX IF NOT EXISTS idx_tags_company_id ON tags(company_id);
  `,
  // audit_logs.company_id fica nullable: ações de nível de plataforma (ex: criação de empresa por
  // um system_user) não pertencem a nenhuma empresa.
  `
  ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
  `,
  // Atualiza a função de auditoria de soft-delete (criada originalmente em database/setup.sql)
  // para também gravar o company_id da linha afetada — ela só é usada em tabelas que têm essa coluna.
  `
  CREATE OR REPLACE FUNCTION ${schema}.audit_soft_delete()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      INSERT INTO ${schema}.audit_logs (
        company_id, entity_type, entity_id, action, user_id, user_email, old_values, new_values
      ) VALUES (
        NEW.company_id,
        TG_TABLE_NAME,
        NEW.id,
        'DELETE',
        NEW.deleted_by,
        (SELECT email FROM ${schema}.users WHERE id = NEW.deleted_by LIMIT 1),
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,

  // Triggers para updated_at
  `
  CREATE OR REPLACE FUNCTION ${schema}.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_system_users_updated_at
    BEFORE UPDATE ON system_users FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_companies_updated_at
    BEFORE UPDATE ON companies FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_knowledge_items_updated_at
    BEFORE UPDATE ON knowledge_items FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_process_flows_updated_at
    BEFORE UPDATE ON process_flows FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();
  `,

  // Admin inicial da Empresa Demo (senha: 123456)
  `
  INSERT INTO users (email, name, password_hash, role, is_active, company_id)
  VALUES (
    'admin@grcflow.local',
    'Administrator',
    '$2a$10$OPMC.i6W1nG0Ha6R4SRocu1tJYYhko9bJ1Naq/3MZFE6UYek7wmqq',
    'admin',
    TRUE,
    (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1)
  ) ON CONFLICT (email) DO UPDATE SET
    password_hash = '$2a$10$OPMC.i6W1nG0Ha6R4SRocu1tJYYhko9bJ1Naq/3MZFE6UYek7wmqq',
    is_active = TRUE;
  `,

  // Usuário de sistema inicial — opera a plataforma (gestão de empresas, suporte), senha: 123456
  `
  INSERT INTO system_users (email, name, password_hash, role, is_active)
  VALUES (
    'platform-admin@grcflow.local',
    'Platform Administrator',
    '$2a$10$OPMC.i6W1nG0Ha6R4SRocu1tJYYhko9bJ1Naq/3MZFE6UYek7wmqq',
    'super_admin',
    TRUE
  ) ON CONFLICT (email) DO UPDATE SET
    password_hash = '$2a$10$OPMC.i6W1nG0Ha6R4SRocu1tJYYhko9bJ1Naq/3MZFE6UYek7wmqq',
    is_active = TRUE;
  `,
];

export async function runMigrations() {
  console.log('Running database migrations...');
  for (const migration of migrations) {
    await db.query(migration);
  }
  console.log('Migrations completed.');
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
