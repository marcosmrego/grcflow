import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export function MainLayout() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated()) return null

  return (
    <div className="container-fluid">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

