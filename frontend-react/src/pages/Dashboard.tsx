import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuthStore } from '../store/authStore'
import { getKnowledgeStats, getKnowledge } from '../lib/api/knowledge'
import { getFlows } from '../lib/api/flows'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { formatDateShort, getStatusLabel } from '../lib/utils'

export function Dashboard() {
  useDocumentTitle('Dashboard')
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['knowledge-stats'],
    queryFn: getKnowledgeStats,
  })

  const { data: knowledgeRes, isLoading: kbLoading } = useQuery({
    queryKey: ['recent-knowledge'],
    queryFn: () => getKnowledge({ limit: 5 }),
  })

  const { data: flowsRes, isLoading: flowsLoading } = useQuery({
    queryKey: ['recent-flows'],
    queryFn: () => getFlows(),
  })

  const stats = statsRes
  const recentKb = (knowledgeRes ?? []).slice(0, 5)
  const recentFlows = (flowsRes ?? []).slice(0, 5)
  const totalFlows = (flowsRes ?? []).length
  const publishedFlows = (flowsRes ?? []).filter((f) => f.status === 'published').length
  const draftFlows = (flowsRes ?? []).filter((f) => f.status === 'draft').length

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Bem-vindo, {user?.name ?? user?.email}!</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => navigate('/knowledge?action=new')} variant="primary">
            + Nova Base
          </Button>
          <Button onClick={() => navigate('/flows?action=new')} variant="success">
            + Novo Fluxo
          </Button>
        </div>
      </div>

      {statsLoading || flowsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="stats-grid">
          <StatCard icon="📚" label="Total de Bases" value={stats?.total ?? 0} iconClass="knowledge" />
          <StatCard icon="🔄" label="Fluxos de Processos" value={totalFlows} iconClass="flows" />
          <StatCard icon="✅" label="Fluxos Publicados" value={publishedFlows} iconClass="published" />
          <StatCard icon="📝" label="Fluxos Rascunho" value={draftFlows} iconClass="draft" />
        </div>
      )}

      <div className="content-grid">
        <Card>
          <CardHeader
            title="📚 Conhecimentos Recentes"
            action={<a href="#" className="link-more" onClick={(e) => { e.preventDefault(); navigate('/knowledge') }}>Ver todos →</a>}
          />
          <CardBody>
            {kbLoading ? <LoadingSpinner /> : recentKb.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Nenhum item encontrado</p>
            ) : (
              <div className="items-list">
                {recentKb.map((item) => (
                  <div key={item.id} className="item-row">
                    <div className="item-info">
                      <div className="item-title">
                        {item.title}
                        <Badge status={item.status}>{getStatusLabel(item.status)}</Badge>
                      </div>
                      <div className="item-meta">
                        <span>{item.category}</span>
                        <span>{item.docType}</span>
                        <span>{formatDateShort(item.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="🔄 Fluxos Recentes"
            action={<a href="#" className="link-more" onClick={(e) => { e.preventDefault(); navigate('/flows') }}>Ver todos →</a>}
          />
          <CardBody>
            {flowsLoading ? <LoadingSpinner /> : recentFlows.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Nenhum fluxo encontrado</p>
            ) : (
              <div className="items-list">
                {recentFlows.map((flow) => (
                  <div key={flow.id} className="item-row">
                    <div className="item-info">
                      <div className="item-title">
                        {flow.name}
                        <Badge status={flow.status}>{getStatusLabel(flow.status)}</Badge>
                      </div>
                      <div className="item-meta">
                        <span>{flow.steps.length} etapas</span>
                        <span>{formatDateShort(flow.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

