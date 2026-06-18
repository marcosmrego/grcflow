import { towerRepository } from '../repositories/TowerRepository';
import { Tower } from '../models/types';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

const normalizeAbbreviation = (value: string): string =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export class TowerService {
  async listTowers(companyId: string, includeInactive = false): Promise<Tower[]> {
    return towerRepository.list(companyId, includeInactive);
  }

  async createTower(companyId: string, name: string, abbreviation: string): Promise<Tower> {
    if (!name?.trim()) throw new ValidationError('Nome da torre é obrigatório.', { field: 'name' });
    const normalized = normalizeAbbreviation(abbreviation || '');
    if (!normalized) {
      throw new ValidationError('Sigla da torre é obrigatória (letras e números).', { field: 'abbreviation' });
    }

    try {
      return await towerRepository.create(companyId, name.trim(), normalized);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictError(`Já existe uma torre com a sigla "${normalized}".`);
      }
      throw err;
    }
  }

  async updateTower(
    id: string,
    companyId: string,
    updates: { name?: string; abbreviation?: string; isActive?: boolean }
  ): Promise<Tower> {
    const abbreviation = updates.abbreviation !== undefined ? normalizeAbbreviation(updates.abbreviation) : undefined;
    if (updates.abbreviation !== undefined && !abbreviation) {
      throw new ValidationError('Sigla da torre é obrigatória (letras e números).', { field: 'abbreviation' });
    }

    try {
      const tower = await towerRepository.update(id, companyId, { ...updates, abbreviation });
      if (!tower) throw new NotFoundError('Tower', id);
      return tower;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictError(`Já existe uma torre com a sigla "${abbreviation}".`);
      }
      throw err;
    }
  }

  async deleteTower(id: string, companyId: string): Promise<void> {
    const deleted = await towerRepository.softDelete(id, companyId);
    if (!deleted) throw new NotFoundError('Tower', id);
  }
}

export const towerService = new TowerService();
