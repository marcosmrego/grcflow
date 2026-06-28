import { apiRequest } from './client'
import type { User } from '../../types'

interface RawUser extends Omit<User, 'isActive' | 'createdAt'> {
  is_active: boolean
  created_at: string
}

interface UsersResponse {
  success: boolean
  data: { items: User[]; total: number }
}

function normalizeUser(u: RawUser): User {
  return {
    ...u,
    isActive: u.is_active,
    createdAt: u.created_at,
  }
}

export async function getUsers(page = 1, limit = 50): Promise<UsersResponse> {
  const raw = await apiRequest<{ success: boolean; data: { items: RawUser[]; total: number } }>(
    `/users?page=${page}&limit=${limit}`
  )
  return {
    ...raw,
    data: {
      ...raw.data,
      items: raw.data.items.map(normalizeUser),
    },
  }
}

export async function createUser(data: { name: string; email: string; password: string; role: string; approvalGroup?: string }): Promise<User> {
  const raw = await apiRequest<RawUser>('/users', { method: 'POST', body: JSON.stringify(data) })
  return normalizeUser(raw)
}

export async function updateUser(id: string, data: Partial<User & { password?: string }>): Promise<User> {
  const raw = await apiRequest<RawUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  return normalizeUser(raw)
}

export async function deleteUser(id: string): Promise<void> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' })
}
