import React, { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

export function AdminLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('grc_system_token')) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  if (!localStorage.getItem('grc_system_token')) return null

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`

  function handleLogout(e: React.MouseEvent) {
    e.preventDefault()
    localStorage.removeItem('grc_system_token')
    localStorage.removeItem('grc_system_user')
    navigate('/admin/login', { replace: true })
  }

  const adminUser = (() => {
    try {
      const raw = localStorage.getItem('grc_system_user')
      return raw ? JSON.parse(raw) as { name?: string; email?: string } : null
    } catch {
      return null
    }
  })()

  return (
    <div className="container-fluid">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo">
            <span className="logo-icon">⚙️</span>
            <span className="logo-text">GRC Plataforma</span>
          </span>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/admin/companies" className={navClass}>
              <span className="nav-icon">🏢</span>
              Empresas
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/leads" className={navClass}>
              <span className="nav-icon">📋</span>
              Leads
            </NavLink>
          </li>
        </ul>
        <div className="navbar-footer">
          <span id="user-info">{adminUser?.name ?? adminUser?.email ?? 'Admin'}</span>
          <a href="#" className="nav-link" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Sair
          </a>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
