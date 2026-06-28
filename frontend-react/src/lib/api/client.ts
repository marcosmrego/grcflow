const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getToken(): string | null {
  return localStorage.getItem('grc_token')
}

function handleUnauthorized(): void {
  localStorage.removeItem('grc_token')
  localStorage.removeItem('grc_user')
  window.location.href = '/login'
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/api${path}`
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    handleUnauthorized()
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg = (body as { error?: { message?: string } }).error?.message ?? `Erro HTTP ${response.status}`
    throw new Error(msg)
  }

  return response.json() as Promise<T>
}

// Admin client — uses grc_system_token
export async function adminApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}/api${path}`
  const token = localStorage.getItem('grc_system_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    localStorage.removeItem('grc_system_token')
    localStorage.removeItem('grc_system_user')
    window.location.href = '/admin/login'
    throw new Error('Sessão administrativa expirada.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg = (body as { error?: { message?: string } }).error?.message ?? `Erro HTTP ${response.status}`
    throw new Error(msg)
  }

  const json = await response.json()
  return (json as { data?: T }).data ?? (json as T)
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
