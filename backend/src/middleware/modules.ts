import { Request, Response, NextFunction } from 'express';
import { companyModuleRepository } from '../repositories/CompanyModuleRepository';

/**
 * Bloqueia o acesso a um conjunto de rotas se a empresa do usuário não tiver o módulo
 * comercial correspondente ativo (ex: empresa que não contratou "flows" não acessa /api/flows).
 * Não se aplica a system_users (painel da plataforma é sempre liberado).
 */
export const requireModule = (moduleKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const isActive = await companyModuleRepository.isActive(req.user.companyId, moduleKey);
      if (!isActive) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MODULE_NOT_ACQUIRED',
            message: `Este recurso requer o módulo "${moduleKey}", que não está ativo para sua empresa.`,
          },
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
