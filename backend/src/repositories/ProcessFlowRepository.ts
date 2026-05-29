import { db } from '../config/database';
import { ProcessFlow, ProcessStep } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class ProcessFlowRepository {
  async create(flow: Omit<ProcessFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessFlow> {
    const id = uuidv4();
    const now = new Date();
    const query = `
      INSERT INTO process_flows (id, name, description, metadata, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
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

  async findById(id: string): Promise<ProcessFlow | null> {
    const query = 'SELECT * FROM process_flows WHERE id = $1;';
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const stepsQuery = 'SELECT * FROM process_steps WHERE flow_id = $1 ORDER BY "order" ASC;';
    const stepsResult = await db.query(stepsQuery, [id]);

    return this.mapFlow(result.rows[0], stepsResult.rows.map(s => this.mapStep(s)));
  }

  async list(status?: string): Promise<ProcessFlow[]> {
    let query = 'SELECT * FROM process_flows';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
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

  async updateFlow(id: string, updates: Partial<ProcessFlow>): Promise<ProcessFlow | null> {
    const now = new Date();
    const query = `
      UPDATE process_flows 
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          metadata = COALESCE($4, metadata),
          status = COALESCE($5, status),
          updated_at = $6
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [
      id,
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

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM process_flows WHERE id = $1;';
    const result = await db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapFlow(row: any, steps: ProcessStep[]): ProcessFlow {
    return {
      id: row.id,
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
