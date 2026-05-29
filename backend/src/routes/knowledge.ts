import express, { Request, Response } from 'express';
import { knowledgeService } from '../services/KnowledgeService';
import { validationResult, body, query, param } from 'express-validator';

const router = express.Router();

// Middleware para tratamento de erros de validação
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET - Listar todos os itens de conhecimento
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const limit = (req.query.limit as any) || 50;
      const offset = (req.query.offset as any) || 0;
      const items = await knowledgeService.listItems(limit, offset);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch knowledge items' });
    }
  }
);

// GET - Buscar itens por categoria
router.get(
  '/category/:category',
  [
    param('category').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const limit = (req.query.limit as any) || 20;
      const offset = (req.query.offset as any) || 0;
      const items = await knowledgeService.getByCategory(category, limit, offset);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items by category' });
    }
  }
);

// GET - Buscar itens por tag
router.get(
  '/tag/:tag',
  [param('tag').notEmpty()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { tag } = req.params;
      const items = await knowledgeService.getByTag(tag);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items by tag' });
    }
  }
);

// GET - Buscar itens por query
router.get(
  '/search',
  [query('q').notEmpty().isString()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const items = await knowledgeService.searchItems(q as string);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search knowledge items' });
    }
  }
);

// GET - Obter um item específico
router.get(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await knowledgeService.getItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Knowledge item not found' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch knowledge item' });
    }
  }
);

// POST - Criar novo item de conhecimento
router.post(
  '/',
  [
    body('category').notEmpty().isString(),
    body('title').notEmpty().isString(),
    body('description').notEmpty().isString(),
    body('content').notEmpty().isString(),
    body('tags').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { category, title, description, content, tags } = req.body;
      const item = await knowledgeService.createItem({
        category,
        title,
        description,
        content,
        tags: tags || [],
      });
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create knowledge item' });
    }
  }
);

// PUT - Atualizar item de conhecimento
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('category').optional().isString(),
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('tags').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedItem = await knowledgeService.updateItem(id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: 'Knowledge item not found' });
      }
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update knowledge item' });
    }
  }
);

// DELETE - Deletar item de conhecimento
router.delete(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await knowledgeService.deleteItem(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Knowledge item not found' });
      }
      res.json({ message: 'Knowledge item deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete knowledge item' });
    }
  }
);

export default router;
