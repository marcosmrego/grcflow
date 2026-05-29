import express, { Request, Response } from 'express';
import { processFlowService } from '../services/ProcessFlowService';
import { validationResult, body, query, param } from 'express-validator';

const router = express.Router();

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET - Listar fluxos
router.get(
  '/',
  [query('status').optional().isIn(['draft', 'published', 'archived'])],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const flows = await processFlowService.listFlows(status as string);
      res.json(flows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch process flows' });
    }
  }
);

// GET - Obter um fluxo específico
router.get(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const flow = await processFlowService.getFlow(id);
      if (!flow) {
        return res.status(404).json({ error: 'Process flow not found' });
      }
      res.json(flow);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch process flow' });
    }
  }
);

// POST - Criar novo fluxo de processo
router.post(
  '/',
  [
    body('name').notEmpty().isString(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
    body('status').optional().isIn(['draft', 'published', 'archived']),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { name, description, metadata, status } = req.body;
      const flow = await processFlowService.createFlow({
        name,
        description: description || '',
        steps: [],
        metadata: metadata || {},
        status: status || 'draft',
      });
      res.status(201).json(flow);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create process flow' });
    }
  }
);

// POST - Adicionar passo ao fluxo
router.post(
  '/:flowId/steps',
  [
    param('flowId').isUUID(),
    body('order').isInt({ min: 0 }),
    body('title').notEmpty().isString(),
    body('type').isIn(['action', 'decision', 'wait', 'notification']),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { flowId } = req.params;
      const { order, title, description, type, inputs, outputs, nextSteps } = req.body;

      const step = await processFlowService.addStepToFlow({
        flowId,
        order,
        title,
        description: description || '',
        type,
        inputs: inputs || {},
        outputs: outputs || {},
        nextSteps: nextSteps || [],
      });
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add step to flow' });
    }
  }
);

// PUT - Atualizar fluxo de processo
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('metadata').optional().isObject(),
    body('status').optional().isIn(['draft', 'published', 'archived']),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedFlow = await processFlowService.updateFlow(id, req.body);
      if (!updatedFlow) {
        return res.status(404).json({ error: 'Process flow not found' });
      }
      res.json(updatedFlow);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update process flow' });
    }
  }
);

// DELETE - Deletar fluxo de processo
router.delete(
  '/:id',
  [param('id').isUUID()],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await processFlowService.deleteFlow(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Process flow not found' });
      }
      res.json({ message: 'Process flow deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete process flow' });
    }
  }
);

export default router;
