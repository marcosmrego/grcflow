import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRequireSystemAdmin } from '../../hooks/useAuth'
import { getLeads, deleteLead } from '../../lib/api/companies'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatDate } from '../../lib/utils'

export function Leads() {
  useDocumentTitle('Leads — Admin')
  useRequireSystemAdmin()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: leadsRes, isLoading } = useQuery({
    queryKey: ['admin-leads', search],
    queryFn: () => getLeads(1, 100, search),
  })

  const leads = leadsRes?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-leads'] }); setDeleteTarget(null) },
  })

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>📋 Leads</h1>
          <p className="subtitle">Contatos capturados pela landing page</p>
        </div>
      </div>

      <Card>
        <CardHeader title={`Leads (${leads.length})`} />
        <CardBody>
          <div className="filters-bar">
            <input className="form-control search-input" placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {isLoading ? <LoadingSpinner /> : leads.length === 0 ? (
            <EmptyState icon="📋" title="Nenhum lead encontrado" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Mensagem</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.email}</td>
                    <td>{lead.company ?? '—'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.message ?? '—'}
                    </td>
                    <td>{formatDate(lead.createdAt)}</td>
                    <td>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(lead.id)}>Excluir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Excluir Lead"
        message="Tem certeza que deseja excluir este lead?"
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

