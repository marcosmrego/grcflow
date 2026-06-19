import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

  // ============= CICLO DE VIDA, VERSIONAMENTO E WORKFLOW DE APROVAÇÃO =============
  // Estende knowledge_items com tipo de documento, código identificador, categoria (FK),
  // confidencialidade, validade e ciclo de vida completo (RF001-RF006 do SRS + FEAT-01)
  `
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS doc_type VARCHAR(10) NOT NULL DEFAULT 'ARTICLE'
    CHECK (doc_type IN ('ARTICLE','POL','POP','IOP','FOR','FLU'));
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS document_code VARCHAR(150);
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS confidentiality VARCHAR(20) NOT NULL DEFAULT 'interno'
    CHECK (confidentiality IN ('publico','interno','restrito','confidencial'));
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS validity_days INT NOT NULL DEFAULT 365;
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_company_document_code
    ON knowledge_items(company_id, document_code) WHERE document_code IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_knowledge_category_id ON knowledge_items(category_id);
  CREATE INDEX IF NOT EXISTS idx_knowledge_expires_at ON knowledge_items(expires_at);

  -- Amplia o ciclo de vida: draft, in_review, pending_approval, published, expired, archived
  ALTER TABLE knowledge_items DROP CONSTRAINT IF EXISTS knowledge_items_status_check;
  ALTER TABLE knowledge_items ADD CONSTRAINT knowledge_items_status_check
    CHECK (status IN ('draft','in_review','pending_approval','published','expired','archived'));
  `,

  // knowledge_item_versions — snapshot a cada save + trilha de auditoria (RF-02/03, RF006)
  `
  CREATE TABLE IF NOT EXISTS knowledge_item_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL,
    change_reason TEXT,
    affected_section TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_by_email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (knowledge_item_id, version_number)
  );
  CREATE INDEX IF NOT EXISTS idx_knowledge_versions_item_id ON knowledge_item_versions(knowledge_item_id);
  `,

  // knowledge_item_approvals — workflow sequencial de 3 alçadas (RF004)
  `
  CREATE TABLE IF NOT EXISTS knowledge_item_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    version_id UUID REFERENCES knowledge_item_versions(id) ON DELETE SET NULL,
    level SMALLINT NOT NULL CHECK (level IN (1,2,3)),
    approver_role VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    justification TEXT,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (knowledge_item_id, version_id, level)
  );
  CREATE INDEX IF NOT EXISTS idx_knowledge_approvals_item_id ON knowledge_item_approvals(knowledge_item_id);
  CREATE INDEX IF NOT EXISTS idx_knowledge_approvals_status ON knowledge_item_approvals(status);
  `,

  // knowledge_item_expiry_notifications — controla envio de alertas 30/15/5 dias (RF005)
  `
  CREATE TABLE IF NOT EXISTS knowledge_item_expiry_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    milestone_days SMALLINT NOT NULL CHECK (milestone_days IN (30,15,5)),
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (knowledge_item_id, milestone_days)
  );
  `,

  // Grupo de alçada de aprovação do usuário (RF004): define qual nível do workflow de
  // 3 alçadas (técnico/compliance/gestor final) o usuário está autorizado a decidir.
  // Combinado com Thiago em 17/06/2026 — hoje qualquer editor aprova qualquer alçada.
  `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_group VARCHAR(20)
    CHECK (approval_group IN ('technical','compliance','final'));
  `,

  // Cadastro de torres/departamentos — combinado com Thiago em 17/06/2026: a sigla do
  // documento passa a ser atrelada a uma torre cadastrada, em vez de digitada livremente.
  `
  CREATE TABLE IF NOT EXISTS towers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (company_id, abbreviation)
  );
  CREATE INDEX IF NOT EXISTS idx_towers_company_id ON towers(company_id);

  -- Contador isolado por torre + tipo de documento: garante numeração sequencial que
  -- nunca é reaproveitada, mesmo se o documento for excluído ou obsoletado.
  CREATE TABLE IF NOT EXISTS tower_document_counters (
    tower_id UUID NOT NULL REFERENCES towers(id) ON DELETE CASCADE,
    doc_type VARCHAR(10) NOT NULL,
    next_number INT NOT NULL DEFAULT 1,
    PRIMARY KEY (tower_id, doc_type)
  );

  ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS tower_id UUID REFERENCES towers(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_knowledge_tower_id ON knowledge_items(tower_id);
  `,

  // Flag "master": acesso a funcionalidades exclusivas, além das permissões normais do role.
  // Não exposta nas rotas de CRUD de usuários (não pode ser setada via API) — só manualmente,
  // como abaixo, para evitar que qualquer admin se autopromova.
  `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE system_users ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;
  `,

  // Marcos (dono do produto): a conta da Expansao-AI vira master, e ganha uma conta pessoal de
  // plataforma (super_admin) com a MESMA senha que ele já usa — copiada do hash existente, nunca
  // em texto puro. DO NOTHING preserva qualquer senha que ele já tenha trocado manualmente depois.
  `
  UPDATE users SET is_master = TRUE WHERE email = 'admin@expansao-ai.com.br';

  INSERT INTO system_users (email, name, password_hash, role, is_active, is_master)
  SELECT 'admin@expansao-ai.com.br', 'Marcos Rego', u.password_hash, 'super_admin', TRUE, TRUE
  FROM users u
  WHERE u.email = 'admin@expansao-ai.com.br'
  ON CONFLICT (email) DO NOTHING;
  `,

  // Cadastro de empresa mais completo (dados comerciais e de contato), pensando no produto
  // como SaaS. Preço ainda não está padronizado — por isso monthly_fee é um campo livre,
  // configurável por empresa, em vez de um plano fixo.
  `
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS segment VARCHAR(100);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(255);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(2);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2);
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT;
  `,

  // Catálogo de módulos comercializáveis. Cada empresa "adquire" módulos individualmente
  // (company_modules) — empresa sem o módulo ativo perde acesso às rotas correspondentes
  // (ver requireModule no backend). Preço por módulo também é configurável por empresa,
  // já que ainda não há tabela de preços fechada.
  `
  CREATE TABLE IF NOT EXISTS modules (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO modules (key, name, description, default_price) VALUES
    ('knowledge_base', 'Base de Conhecimento', 'Gestão documental, ciclo de vida, workflow de aprovação e torres/departamentos', 0)
    ON CONFLICT (key) DO NOTHING;
  INSERT INTO modules (key, name, description, default_price) VALUES
    ('flows', 'Fluxos de Processos', 'Modelagem e gestão de fluxos de processos', 0)
    ON CONFLICT (key) DO NOTHING;

  CREATE TABLE IF NOT EXISTS company_modules (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL REFERENCES modules(key) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(10,2),
    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, module_key)
  );

  -- Backfill único: empresas já existentes continuam com o que já usavam (knowledge_base e
  -- flows), pra não quebrar nada em produção quando o gating entrar em vigor. Restrito a essas
  -- duas chaves de propósito — se um módulo novo for adicionado depois, ele NÃO deve ser
  -- concedido de graça pra empresas existentes nesse mesmo INSERT.
  INSERT INTO company_modules (company_id, module_key, is_active, price)
  SELECT c.id, m.key, TRUE, m.default_price
  FROM companies c
  CROSS JOIN modules m
  WHERE m.key IN ('knowledge_base', 'flows')
  ON CONFLICT (company_id, module_key) DO NOTHING;
  `,

  // Histórico de cobranças mensais por empresa (mini-financeiro). Status fica só
  // pending/paid/cancelled — "atrasado" é derivado (pending + due_date no passado), calculado
  // na camada de serviço, pra não precisar de um cron sincronizando esse estado.
  `
  CREATE TABLE IF NOT EXISTS company_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reference_month DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, reference_month)
  );
  CREATE INDEX IF NOT EXISTS idx_company_invoices_company_id ON company_invoices(company_id);
  `,

  // Marca a Empresa Demo como tal (acesso público via /api/demo/login, sempre somente
  // leitura) e cria a tabela de leads capturados pela landing page de marketing.
  `
  ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
  UPDATE companies SET is_demo = TRUE WHERE name = 'Empresa Demo';

  CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    message TEXT,
    source VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
  `,
];

// Cria os admins iniciais (Empresa Demo + plataforma) somente na primeira execução e somente
// se a senha vier de uma env var — nunca mais um hash fixo no código. Anteriormente o hash de
// "123456" ficava comitado no repositório (público) e o INSERT usava ON CONFLICT DO UPDATE,
// o que resetava a senha e reativava a conta a cada restart do servidor, mesmo após troca manual.
if (process.env.SEED_ADMIN_PASSWORD) {
  migrations.push(`
  INSERT INTO users (email, name, password_hash, role, is_active, company_id)
  VALUES (
    'admin@grcflow.local',
    'Administrator',
    '${bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD, 10)}',
    'admin',
    TRUE,
    (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1)
  ) ON CONFLICT (email) DO NOTHING;
  `);
} else {
  console.warn('[seed] SEED_ADMIN_PASSWORD não definida — admin inicial da Empresa Demo não será criado.');
}

if (process.env.SEED_PLATFORM_ADMIN_PASSWORD) {
  migrations.push(`
  INSERT INTO system_users (email, name, password_hash, role, is_active)
  VALUES (
    'platform-admin@grcflow.local',
    'Platform Administrator',
    '${bcrypt.hashSync(process.env.SEED_PLATFORM_ADMIN_PASSWORD, 10)}',
    'super_admin',
    TRUE
  ) ON CONFLICT (email) DO NOTHING;
  `);
} else {
  console.warn('[seed] SEED_PLATFORM_ADMIN_PASSWORD não definida — admin de plataforma inicial não será criado.');
}

// Usuário de acesso à demonstração pública (landing page), vinculado à Empresa Demo com role
// 'editor' (cria/edita conteúdo, mas não gerencia usuários/roles). A senha é gerada
// aleatoriamente e descartada em seguida — POST /api/demo/login nunca verifica senha, o hash
// só existe pra satisfazer a coluna NOT NULL. Diferente dos admins acima, não depende de env
// var porque não há segredo real aqui.
//
// Decidir qualquer alçada de aprovação (não só a do seu approval_group) é liberado em
// KnowledgeService.decideApproval pela flag companies.is_demo, não por um role especial nessa
// linha — o usuário demo nunca precisa (e nunca deve) ter role 'admin' de verdade no banco,
// já que esse endpoint é público e sem credenciais.
migrations.push(`
  INSERT INTO users (email, name, password_hash, role, is_active, company_id)
  SELECT 'demo@grcflow.local', 'Visitante Demo', '${bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10)}',
         'editor', TRUE, (SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1)
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@grcflow.local');
`);

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
