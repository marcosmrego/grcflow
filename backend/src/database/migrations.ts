import { db } from '../config/database';
import { config } from '../config';

const migrations = [
  // Garantir que o schema existe antes de tudo
  `CREATE SCHEMA IF NOT EXISTS ${config.database.schema};`,

  // Habilitar extensões (precisam ficar no schema public)
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE EXTENSION IF NOT EXISTS "pg_trgm";`,

  // Create knowledge_items table
  `
    CREATE TABLE IF NOT EXISTS knowledge_items (
      id UUID PRIMARY KEY,
      category VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_items(category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_items USING GIN(tags);
  `,

  // Create process_flows table
  `
    CREATE TABLE IF NOT EXISTS process_flows (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_flows_status ON process_flows(status);
    CREATE INDEX IF NOT EXISTS idx_flows_created_at ON process_flows(created_at);
  `,

  // Create process_steps table
  `
    CREATE TABLE IF NOT EXISTS process_steps (
      id UUID PRIMARY KEY,
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

  // Create categories table
  `
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
  `,

  // Create tags table
  `
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      color VARCHAR(7),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `,
];

export async function runMigrations() {
  try {
    for (const migration of migrations) {
      await db.query(migration);
      console.log('Migration executed successfully');
    }
    console.log('All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
