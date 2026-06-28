import { apiRequest } from './client'
import type { Flow, FlowStep } from '../../types'

export async function getFlows(status?: string): Promise<Flow[]> {
  const q = status ? `?status=${status}` : ''
  return apiRequest(`/flows${q}`)
}

export async function getFlow(id: string): Promise<Flow> {
  return apiRequest(`/flows/${id}`)
}

export async function createFlow(data: Partial<Flow>): Promise<Flow> {
  return apiRequest('/flows', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateFlow(id: string, data: Partial<Flow>): Promise<Flow> {
  return apiRequest(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteFlow(id: string): Promise<void> {
  return apiRequest(`/flows/${id}`, { method: 'DELETE' })
}

export async function addFlowStep(flowId: string, stepData: Partial<FlowStep>): Promise<FlowStep> {
  return apiRequest(`/flows/${flowId}/steps`, { method: 'POST', body: JSON.stringify(stepData) })
}

export async function deleteFlowStep(flowId: string, stepId: string): Promise<void> {
  return apiRequest(`/flows/${flowId}/steps/${stepId}`, { method: 'DELETE' })
}
