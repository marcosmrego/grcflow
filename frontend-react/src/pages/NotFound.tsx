import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '4rem' }}>🔍</div>
      <h1 style={{ margin: 0 }}>Página não encontrada</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>O endereço acessado não existe ou foi movido.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para o Dashboard</button>
    </div>
  )
}
