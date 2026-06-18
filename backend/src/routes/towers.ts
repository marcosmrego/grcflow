import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { towerService } from '../services/TowerService';
import { authMiddleware, requireAuth, requireAdmin, requireModule, AuthenticationError } from '../middleware';

const router = express.Router();

// Torres existem só pra numerar documentos da Base de Conhecimento — mesmo módulo daquela.
router.use(authMiddleware, requireAuth, requireModule('knowledge_base'));

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET - Listar torres/departamentos da empresa (qualquer usuário autenticado precisa
// para selecionar a torre ao criar um documento controlado)
router.get('/', async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const towers = await towerService.listTowers(req.user.companyId);
    res.json(towers);
  } catch (error) {
    next(error);
  }
});

// POST - Criar torre (admin only)
router.post(
  '/',
  requireAdmin,
  [body('name').notEmpty().isString(), body('abbreviation').notEmpty().isString()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const tower = await towerService.createTower(req.user.companyId, req.body.name, req.body.abbreviation);
      res.status(201).json(tower);
    } catch (error) {
      next(error);
    }
  }
);

// PUT - Atualizar torre (admin only)
router.put(
  '/:id',
  requireAdmin,
  [
    param('id').isUUID(),
    body('name').optional().isString(),
    body('abbreviation').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      const tower = await towerService.updateTower(req.params.id, req.user.companyId, {
        name: req.body.name,
        abbreviation: req.body.abbreviation,
        isActive: req.body.isActive,
      });
      res.json(tower);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE - Remover torre (admin only)
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.user) throw new AuthenticationError('User not authenticated');
      await towerService.deleteTower(req.params.id, req.user.companyId);
      res.json({ message: 'Tower deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
