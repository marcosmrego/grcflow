import { apiRequest } from './client'
import type { KnowledgeItem, KnowledgeStats } from '../../types'

interface KnowledgeListResponse {
  success: boolean
  data: KnowledgeItem[]
  meta: { total: number; page: number; limit: number }
}

export async function getKnowledge(params?: { limit?: number; offset?: number }): Promise<KnowledgeListResponse> {
  const q = new URLSearchParams()
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest(`/knowledge?${q}`)
}

export async function searchKnowledge(query: string): Promise<{ success: boolean; data: KnowledgeItem[] }> {
  return apiRequest(`/knowledge/search?q=${encodeURIComponent(query)}`)
}

export async function getKnowledgeItem(id: string): Promise<{ success: boolean; data: KnowledgeItem }> {
  return apiRequest(`/knowledge/${id}`)
}

export async function createKnowledge(data: Partial<KnowledgeItem>): Promise<{ success: boolean; data: KnowledgeItem }> {
  return apiRequest('/knowledge', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateKnowledge(id: string, data: Partial<KnowledgeItem>): Promise<{ success: boolean; data: KnowledgeItem }> {
  return apiRequest(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteKnowledge(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/knowledge/${id}`, { method: 'DELETE' })
}

export async function getKnowledgeStats(): Promise<{ success: boolean; data: KnowledgeStats }> {
  return apiRequest('/knowledge/stats')
}
