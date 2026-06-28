import { apiRequest } from './client'
import type { User } from '../../types'

interface UsersResponse {
  success: boolean
  data: { items: User[]; total: number }
}

export async function getUsers(page = 1, limit = 50): Promise<UsersResponse> {
  return apiRequest(`/users?page=${page}&limit=${limit}`)
}

export async function createUser(data: { name: string; email: string; password: string; role: string; approvalGroup?: string }): Promise<User> {
  return apiRequest('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: Partial<User & { password?: string }>): Promise<User> {
  return apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUser(id: string): Promise<void> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' })
}
