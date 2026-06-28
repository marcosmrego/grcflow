import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  return useAuthStore()
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return isAuthenticated()
}

export function useRequireAdmin() {
  const { isAuthenticated, isAdmin } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
    } else if (!isAdmin()) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isAdmin, navigate])

  return isAuthenticated() && isAdmin()
}

export function useRequireSystemAdmin() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('grc_system_token')) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  return !!localStorage.getItem('grc_system_token')
}
