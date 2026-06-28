import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { checkHealth } from '../../lib/api/client'

export function Sidebar() {
  const { user, logout, isAdmin } = useAuthStore()
  const [online, setOnline] = useState(false)

  useEffect(() => {
    checkHealth().then(setOnline)
    const interval = setInterval(() => checkHealth().then(setOnline), 30000)
    return () => clearInterval(interval)
  }, [])

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">GRC Flow</span>
        </span>
      </div>

      <ul className="nav-links">
        <li>
          <NavLink to="/" end className={navClass}>
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/knowledge" className={navClass}>
            <span className="nav-icon">📚</span>
            Base de Conhecimento
          </NavLink>
        </li>
        <li>
          <NavLink to="/flows" className={navClass}>
            <span className="nav-icon">🔄</span>
            Fluxos
          </NavLink>
        </li>
        {isAdmin() && (
          <>
            <li id="nav-users-item">
              <NavLink to="/users" className={navClass}>
                <span className="nav-icon">👥</span>
                Usuários
              </NavLink>
            </li>
            <li id="nav-towers-item">
              <NavLink to="/towers" className={navClass}>
                <span className="nav-icon">🏢</span>
                Torres
              </NavLink>
            </li>
          </>
        )}
        <li>
          <NavLink to="/settings" className={navClass}>
            <span className="nav-icon">🔧</span>
            Configurações
          </NavLink>
        </li>
      </ul>

      <div className="navbar-footer">
        <div className="status-indicator" style={{ padding: '0.6rem 1.25rem 0.6rem 1.5rem' }}>
          <span className={`dot ${online ? 'online' : 'offline'}`} />
          <span id="api-status" style={{ fontSize: '0.82rem', color: online ? 'var(--success)' : 'var(--danger)' }}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
        <span id="user-info">{user?.name ?? user?.email ?? ''}</span>
        <a
          href="#"
          className="nav-link"
          id="logout-link"
          onClick={(e) => { e.preventDefault(); logout() }}
        >
          <span className="nav-icon">🚪</span>
          Sair
        </a>
      </div>
    </nav>
  )
}

