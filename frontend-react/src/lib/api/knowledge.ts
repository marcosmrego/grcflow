import { apiRequest } from './client'
import type { KnowledgeItem, KnowledgeStats } from '../../types'

export async function getKnowledge(params?: { limit?: number; offset?: number }): Promise<KnowledgeItem[]> {
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest(`/knowledge?${q}`)
}

export async function searchKnowledge(query: string): Promise<KnowledgeItem[]> {
  return apiRequest(`/knowledge/search?q=${encodeURIComponent(query)}`)
}

export async function getKnowledgeItem(id: string): Promise<KnowledgeItem> {
  return apiRequest(`/knowledge/${id}`)
}

export async function createKnowledge(data: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
  return apiRequest('/knowledge', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateKnowledge(id: string, data: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
  return apiRequest(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteKnowledge(id: string): Promise<void> {
  return apiRequest(`/knowledge/${id}`, { method: 'DELETE' })
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return apiRequest('/knowledge/stats')
}
