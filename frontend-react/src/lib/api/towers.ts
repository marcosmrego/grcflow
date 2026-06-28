import { apiRequest } from './client'
import type { Tower } from '../../types'

export async function getTowers(): Promise<{ success: boolean; data: Tower[] }> {
  return apiRequest('/towers')
}

export async function createTower(data: { name: string; abbreviation: string }): Promise<{ success: boolean; data: Tower }> {
  return apiRequest('/towers', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateTower(id: string, data: Partial<Tower>): Promise<{ success: boolean; data: Tower }> {
  return apiRequest(`/towers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteTower(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/towers/${id}`, { method: 'DELETE' })
}
