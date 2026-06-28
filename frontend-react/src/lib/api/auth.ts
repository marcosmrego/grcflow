import { apiRequest } from './client'
import type { User } from '../../types'

interface LoginResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken?: string
    user: User
  }
}

export async function login(email: string, password: string): Promise<LoginResponse['data']> {
  const res = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  return res.data!
}

interface AdminLoginResponse {
  success: boolean
  data: {
    token: string
    admin: { id: string; name: string; email: string; role: string }
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse['data']> {
  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${API_BASE}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: { message?: string } }).error?.message ?? 'Falha no login')
  }
  const json = await res.json() as AdminLoginResponse
  return json.data!
}
