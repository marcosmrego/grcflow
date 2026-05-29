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

  // Triggers para updated_at
  `
  CREATE OR REPLACE FUNCTION ${schema}.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_knowledge_items_updated_at
    BEFORE UPDATE ON knowledge_items FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();

  CREATE OR REPLACE TRIGGER trigger_process_flows_updated_at
    BEFORE UPDATE ON process_flows FOR EACH ROW
    EXECUTE FUNCTION ${schema}.update_updated_at_column();
  `,

  // Admin inicial (senha: 123456)
  `
  INSERT INTO users (email, name, password_hash, role, is_active)
  VALUES (
    'admin@grcflow.local',
    'Administrator',
    '$2a$10$OPMC.i6W1nG0Ha6R4SRocu1tJYYhko9bJ1Naq/3MZFE6UYek7wmqq',
    'admin',
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
