import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  try {
    // Empresa demo — todos os dados de exemplo pertencem a ela
    const companyResult = await db.query(
      `SELECT id FROM companies WHERE name = 'Empresa Demo' LIMIT 1`
    );
    if (companyResult.rows.length === 0) {
      throw new Error("Empresa 'Empresa Demo' não encontrada. Rode as migrations antes de seedar.");
    }
    const companyId = companyResult.rows[0].id;

    // Seed categories
    const categories = [
      { id: uuidv4(), name: 'Governance', description: 'Governance-related knowledge items' },
      { id: uuidv4(), name: 'Risk Management', description: 'Risk management processes and procedures' },
      { id: uuidv4(), name: 'Compliance', description: 'Compliance requirements and standards' },
      { id: uuidv4(), name: 'Policies', description: 'Organizational policies' },
      { id: uuidv4(), name: 'Procedures', description: 'Standard procedures' },
    ];

    for (const category of categories) {
      await db.query(
        `INSERT INTO categories (id, company_id, name, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [category.id, companyId, category.name, category.description]
      );
    }

    // Seed tags
    const tags = [
      { id: uuidv4(), name: 'urgent', color: '#FF0000' },
      { id: uuidv4(), name: 'compliance', color: '#0000FF' },
      { id: uuidv4(), name: 'process', color: '#00FF00' },
      { id: uuidv4(), name: 'template', color: '#FFFF00' },
      { id: uuidv4(), name: 'approved', color: '#00AA00' },
    ];

    for (const tag of tags) {
      await db.query(
        `INSERT INTO tags (id, company_id, name, color) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [tag.id, companyId, tag.name, tag.color]
      );
    }

    // Seed knowledge items
    const knowledgeItems = [
      {
        id: uuidv4(),
        category: 'Governance',
        title: 'Board Governance Framework',
        description: 'Framework for board governance and oversight',
        content: 'This document outlines the governance structure and responsibilities of the board...',
        tags: JSON.stringify(['governance', 'approved']),
      },
      {
        id: uuidv4(),
        category: 'Compliance',
        title: 'Data Privacy Policy',
        description: 'Organization data privacy and protection policy',
        content: 'All personal data must be handled in compliance with GDPR and applicable regulations...',
        tags: JSON.stringify(['compliance', 'urgent']),
      },
      {
        id: uuidv4(),
        category: 'Risk Management',
        title: 'Risk Assessment Procedure',
        description: 'Procedure for conducting risk assessments',
        content: 'Risk assessments should be conducted quarterly and include all operational areas...',
        tags: JSON.stringify(['process', 'template']),
      },
    ];

    for (const item of knowledgeItems) {
      await db.query(
        `INSERT INTO knowledge_items (id, company_id, category, title, description, content, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [item.id, companyId, item.category, item.title, item.description, item.content, item.tags]
      );
    }

    console.log('Database seeding completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
