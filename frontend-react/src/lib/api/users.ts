import { apiRequest } from './client'
import type { User } from '../../types'

export async function getUsers(page = 1, limit = 50): Promise<{ success: boolean; data: User[]; meta: { total: number } }> {
  return apiRequest(`/users?page=${page}&limit=${limit}`)
}

export async function createUser(data: { name: string; email: string; password: string; role: string; approvalGroup?: string }): Promise<{ success: boolean; data: User }> {
  return apiRequest('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: Partial<User & { password?: string }>): Promise<{ success: boolean; data: User }> {
  return apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' })
}
