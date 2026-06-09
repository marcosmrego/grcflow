import { db } from '../config/database';
import { ProcessFlow, ProcessStep } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class ProcessFlowRepository {
  async create(flow: Omit<ProcessFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessFlow> {
    const id = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO process_flows (id, company_id, name, description, metadata, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      flow.companyId,
      flow.name,
      flow.description,
      JSON.stringify(flow.metadata || {}),
      flow.status || 'draft',
      now,
      now,
    ]);
    const flowRow = result.rows[0];
    return this.mapFlow(flowRow, flow.steps);
  }

  async findById(id: string, companyId: string): Promise<ProcessFlow | null> {
    const query = 'SELECT * FROM process_flows WHERE id = $1 AND company_id = $2;';
    const result = await db.query(query, [id, companyId]);
    if (result.rows.length === 0) return null;

    const stepsQuery = 'SELECT * FROM process_steps WHERE flow_id = $1 ORDER BY "order" ASC;';
    const stepsResult = await db.query(stepsQuery, [id]);

    return this.mapFlow(result.rows[0], stepsResult.rows.map(s => this.mapStep(s)));
  }

  async list(companyId: string, status?: string): Promise<ProcessFlow[]> {
    let query = 'SELECT * FROM process_flows WHERE company_id = $1';
    const params: any[] = [companyId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC;';

    const result = await db.query(query, params);

    const flowPromises = result.rows.map(async (flowRow) => {
      const stepsQuery = 'SELECT * FROM process_steps WHERE flow_id = $1 ORDER BY "order" ASC;';
      const stepsResult = await db.query(stepsQuery, [flowRow.id]);
      return this.mapFlow(flowRow, stepsResult.rows.map(s => this.mapStep(s)));
    });

    return Promise.all(flowPromises);
  }

  /**
   * Confere se o fluxo pertence à empresa antes de manipular seus passos
   */
  async belongsToCompany(flowId: string, companyId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT 1 FROM process_flows WHERE id = $1 AND company_id = $2;',
      [flowId, companyId]
    );
    return result.rows.length > 0;
  }

  async addStep(step: Omit<ProcessStep, 'id'>): Promise<ProcessStep> {
    const id = uuidv4();
    const query = `
      INSERT INTO process_steps (id, flow_id, "order", title, description, type, inputs, outputs, next_steps)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      step.flowId,
      step.order,
      step.title,
      step.description,
      step.type,
      JSON.stringify(step.inputs || {}),
      JSON.stringify(step.outputs || {}),
      JSON.stringify(step.nextSteps || []),
    ]);
    return this.mapStep(result.rows[0]);
  }

  async updateFlow(id: string, companyId: string, updates: Partial<ProcessFlow>): Promise<ProcessFlow | null> {
    const now = new Date();
    const query = `
      UPDATE process_flows
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          metadata = COALESCE($5, metadata),
          status = COALESCE($6, status),
          updated_at = $7
      WHERE id = $1 AND company_id = $2
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
      companyId,
      updates.name,
      updates.description,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      updates.status,
      now,
    ]);

    if (result.rows.length === 0) return null;

    const stepsQuery = 'SELECT * FROM process_steps WHERE flow_id = $1 ORDER BY "order" ASC;';
    const stepsResult = await db.query(stepsQuery, [id]);

    return this.mapFlow(result.rows[0], stepsResult.rows.map(s => this.mapStep(s)));
  }

  async deleteStep(stepId: string, flowId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM process_steps WHERE id = $1 AND flow_id = $2;',
      [stepId, flowId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const query = 'DELETE FROM process_flows WHERE id = $1 AND company_id = $2;';
    const result = await db.query(query, [id, companyId]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapFlow(row: any, steps: ProcessStep[]): ProcessFlow {
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      description: row.description,
      steps,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapStep(row: any): ProcessStep {
    return {
      id: row.id,
      flowId: row.flow_id,
      order: row.order,
      title: row.title,
      description: row.description,
      type: row.type,
      inputs: typeof row.inputs === 'string' ? JSON.parse(row.inputs) : row.inputs,
      outputs: typeof row.outputs === 'string' ? JSON.parse(row.outputs) : row.outputs,
      nextSteps: typeof row.next_steps === 'string' ? JSON.parse(row.next_steps) : row.next_steps,
    };
  }
}

export const processFlowRepository = new ProcessFlowRepository();
