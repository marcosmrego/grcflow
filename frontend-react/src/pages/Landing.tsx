import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function Landing() {
  useDocumentTitle('GRC Flow')
  return (
    <div className="login-page" style={{ flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>GRC Flow</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Plataforma de Governança, Risco e Conformidade
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-primary">Acessar Plataforma</Link>
        </div>
      </div>
    </div>
  )
}

