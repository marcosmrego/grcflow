import express, { Request, Response } from 'express';
import { knowledgeService } from '../services/KnowledgeService';
import { userRepository } from '../repositories/UserRepository';
import { validationResult, body, query, param } from 'express-validator';
import { authMiddleware, requireAuth, requirePermission, requireModule, AuthenticationError } from '../middleware';

const router = express.Router();

router.use(authMiddleware, requireAuth, requireModule('knowledge_base'));

// Middleware para tratamento de erros de validação
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const DOC_TYPES = ['ARTICLE', 'POL', 'POP', 'IOP', 'FOR', 'FLU'];
const CONFIDENTIALITY_LEVELS = ['publico', 'interno', 'restrito', 'confidencial'];

// O JWT não traz o nome do usuário (req.user.name vem vazio) — busca no banco
// para preencher created_by_name na trilha de auditoria (RF006).
const getAuthor = async (req: Request) => {
  const user = req.user!;
  const dbUser = await userRepository.findByIdInCompany(user.id, user.companyId);
  return {
    id: user.id,
    name: dbUser?.name || user.name,
    email: user.email,
  };
};

// GET - KPIs do dashboard (Total, Em Dia, Vencidos, Alerta)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const stats = await knowledgeService.getStats(req.user.companyId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge stats' });
  }
});

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
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const limit = (req.query.limit as any) || 50;
      const offset = (req.query.offset as any) || 0;
      const items = await knowledgeService.listItems(req.user.companyId, limit, offset, req.user.role);
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
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { category } = req.params;
      const limit = (req.query.limit as any) || 20;
      const offset = (req.query.offset as any) || 0;
      const items = await knowledgeService.getByCategory(req.user.companyId, category, limit, offset, req.user.role);
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
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { tag } = req.params;
      const items = await knowledgeService.getByTag(req.user.companyId, tag, req.user.role);
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
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { q } = req.query;
      const items = await knowledgeService.searchItems(req.user.companyId, q as string, req.user.role);
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
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const item = await knowledgeService.getItem(id, req.user.companyId, req.user.role);
      if (!item) {
        return res.status(404).json({ error: 'Knowledge item not found' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch knowledge item' });
    }
  }
);

// GET - Histórico de versões de um item (RF-03)
router.get(
  '/:id/versions',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const versions = await knowledgeService.listVersions(id, req.user.companyId);
      res.json(versions);
    } catch (error) {
      next(error);
    }
  }
);

// GET - Status do workflow de aprovação (RF004)
router.get(
  '/:id/approvals',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const approvals = await knowledgeService.listApprovals(id, req.user.companyId);
      res.json(approvals);
    } catch (error) {
      next(error);
    }
  }
);

// POST - Criar novo item de conhecimento
router.post(
  '/',
  requirePermission('CREATE_KNOWLEDGE'),
  [
    body('category').notEmpty().isString(),
    body('title').notEmpty().isString(),
    body('description').notEmpty().isString(),
    body('content').notEmpty().isString(),
    body('tags').optional().isArray(),
    body('docType').optional().isIn(DOC_TYPES),
    body('towerId').optional({ nullable: true }).isUUID(),
    body('categoryId').optional().isUUID(),
    body('confidentiality').optional().isIn(CONFIDENTIALITY_LEVELS),
    body('validityDays').optional().isInt({ min: 1 }).toInt(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { category, title, description, content, tags, docType, towerId, categoryId, confidentiality, validityDays } = req.body;
      const item = await knowledgeService.createItem(
        {
          companyId: req.user.companyId,
          category,
          categoryId: categoryId || null,
          title,
          description,
          content,
          tags: tags || [],
          docType: docType || 'ARTICLE',
          towerId: towerId || null,
          confidentiality: confidentiality || 'interno',
          validityDays: validityDays || 365,
        },
        await getAuthor(req)
      );
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// PUT - Atualizar item de conhecimento
router.put(
  '/:id',
  requirePermission('UPDATE_KNOWLEDGE'),
  [
    param('id').isUUID(),
    body('category').optional().isString(),
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('content').optional().isString(),
    body('tags').optional().isArray(),
    body('categoryId').optional().isUUID(),
    body('confidentiality').optional().isIn(CONFIDENTIALITY_LEVELS),
    body('validityDays').optional().isInt({ min: 1 }).toInt(),
    body('changeReason').optional().isString(),
    body('affectedSection').optional().isString(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const { changeReason, affectedSection, ...updates } = req.body;
      const updatedItem = await knowledgeService.updateItem(id, req.user.companyId, updates, await getAuthor(req), {
        changeReason,
        affectedSection,
      });
      if (!updatedItem) {
        return res.status(404).json({ error: 'Knowledge item not found' });
      }
      res.json(updatedItem);
    } catch (error) {
      next(error);
    }
  }
);

// POST - Restaurar uma versão anterior (RF-03)
router.post(
  '/:id/restore/:versionNumber',
  requirePermission('UPDATE_KNOWLEDGE'),
  [param('id').isUUID(), param('versionNumber').isInt({ min: 1 }).toInt()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id, versionNumber } = req.params;
      const item = await knowledgeService.restoreVersion(id, req.user.companyId, parseInt(versionNumber, 10), await getAuthor(req));
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// POST - Enviar item para o workflow de aprovação em 3 alçadas (RF004)
router.post(
  '/:id/submit',
  requirePermission('UPDATE_KNOWLEDGE'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const result = await knowledgeService.submitForApproval(id, req.user.companyId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST - Aprovar alçada (RF004)
router.post(
  '/:id/approve',
  requirePermission('UPDATE_KNOWLEDGE'),
  [param('id').isUUID(), body('level').isInt({ min: 1, max: 3 }).toInt()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const { level } = req.body;
      const result = await knowledgeService.decideApproval(id, req.user.companyId, level, 'approved', req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST - Reprovar alçada (RF004) — exige justificativa
router.post(
  '/:id/reject',
  requirePermission('UPDATE_KNOWLEDGE'),
  [param('id').isUUID(), body('level').isInt({ min: 1, max: 3 }).toInt(), body('justification').notEmpty().isString()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const { level, justification } = req.body;
      const result = await knowledgeService.decideApproval(id, req.user.companyId, level, 'rejected', req.user.id, justification);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE - Deletar item de conhecimento
router.delete(
  '/:id',
  requirePermission('DELETE_KNOWLEDGE'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const { id } = req.params;
      const deleted = await knowledgeService.deleteItem(id, req.user.companyId);
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
