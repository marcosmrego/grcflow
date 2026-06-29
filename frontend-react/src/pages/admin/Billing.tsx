import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRequireSystemAdmin } from '../../hooks/useAuth'
import { getBillingOverview, getBillingInvoices, updateCompanyInvoice, sendInvoiceEmail, getInvoiceActionLogs } from '../../lib/api/companies'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import type { BillingInvoice, InvoiceActionLog } from '../../types'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'paid', label: 'Pago' },
  { value: 'cancelled', label: 'Cancelada' },
]

function statusBadge(displayStatus: string) {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'secondary'> = {
    paid: 'success',
    overdue: 'danger',
    pending: 'warning',
    cancelled: 'secondary',
  }
  const labels: Record<string, string> = {
    paid: 'Pago',
    overdue: 'Vencida',
    pending: 'Pendente',
    cancelled: 'Cancelada',
  }
  return <Badge variant={map[displayStatus] ?? 'secondary'}>{labels[displayStatus] ?? displayStatus}</Badge>
}

function formatMonthRef(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  } catch {
    return raw
  }
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    return new Date(raw).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function Billing() {
  useDocumentTitle('Faturamento — Admin')
  useRequireSystemAdmin()

  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [logTarget, setLogTarget] = useState<BillingInvoice | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: getBillingOverview,
  })

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['billing-invoices', statusFilter],
    queryFn: () => getBillingInvoices({ status: statusFilter || undefined, limit: 100 }),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ companyId, invoiceId }: { companyId: string; invoiceId: string }) =>
      updateCompanyInvoice(companyId, invoiceId, { status: 'paid' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-overview'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ companyId, invoiceId }: { companyId: string; invoiceId: string }) =>
      updateCompanyInvoice(companyId, invoiceId, { status: 'cancelled' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-invoices'] })
      qc.invalidateQueries({ queryKey: ['billing-overview'] })
    },
  })

  const sendEmailMutation = useMutation({
    mutationFn: ({ companyId, invoiceId }: { companyId: string; invoiceId: string }) => {
      setSendingId(invoiceId)
      return sendInvoiceEmail(companyId, invoiceId)
    },
    onSettled: () => setSendingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing-invoices'] }),
    onError: (err: Error) => alert(`Erro ao enviar e-mail: ${err.message}`),
  })

  const { data: actionLogs, isLoading: logsLoading } = useQuery<InvoiceActionLog[]>({
    queryKey: ['invoice-logs', logTarget?.companyId, logTarget?.id],
    queryFn: () => getInvoiceActionLogs(logTarget!.companyId, logTarget!.id),
    enabled: !!logTarget,
  })

  const invoices: BillingInvoice[] = invoicesRes?.items ?? []

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>💰 Faturamento</h1>
          <p className="subtitle">Contas a receber e controle de faturas</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="MRR (mês atual)"
          value={overviewLoading ? '…' : formatBRL(overview?.mrr ?? 0)}
          icon="📈"
        />
        <KpiCard
          title="A Receber"
          value={overviewLoading ? '…' : formatBRL(overview?.pendingAmount ?? 0)}
          icon="🕐"
          sub={overview ? `${overview.upcomingCount} nos próximos 30 dias` : undefined}
        />
        <KpiCard
          title="Vencidas"
          value={overviewLoading ? '…' : formatBRL(overview?.overdueAmount ?? 0)}
          icon="⚠️"
          danger={!!overview && overview.overdueCount > 0}
          sub={overview ? `${overview.overdueCount} fatura(s)` : undefined}
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader
          title={`Faturas (${invoicesRes?.pagination.total ?? '…'})`}
          action={
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          }
        />
        <CardBody>
          {invoicesLoading ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <EmptyState icon="💰" title="Nenhuma fatura encontrada" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Mês Ref.</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Pago em</th>
                  <th>E-mail</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const canAct = inv.displayStatus === 'pending' || inv.displayStatus === 'overdue'
                  const isSending = sendingId === inv.id
                  return (
                    <tr key={inv.id}>
                      <td>{inv.companyName}</td>
                      <td>{formatMonthRef(inv.referenceMonth)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBRL(inv.amount)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>{statusBadge(inv.displayStatus)}</td>
                      <td>{formatDate(inv.paidAt)}</td>
                      <td>
                        {inv.sentAt ? (
                          <div>
                            <Badge variant="success">Enviado</Badge>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{formatDate(inv.sentAt)}</div>
                            <Button size="sm" variant="outline" style={{ marginTop: '4px' }} loading={isSending} onClick={() => sendEmailMutation.mutate({ companyId: inv.companyId, invoiceId: inv.id })}>Reenviar</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="primary" loading={isSending} onClick={() => sendEmailMutation.mutate({ companyId: inv.companyId, invoiceId: inv.id })}>
                            📧 Enviar
                          </Button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {canAct && (
                            <>
                              <Button size="sm" variant="success" onClick={() => markPaidMutation.mutate({ companyId: inv.companyId, invoiceId: inv.id })} loading={markPaidMutation.isPending}>Pago</Button>
                              <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate({ companyId: inv.companyId, invoiceId: inv.id })} loading={cancelMutation.isPending}>Cancelar</Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" title="Histórico" onClick={() => setLogTarget(inv)}>📋</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Modal Histórico */}
      {logTarget && (
        <Modal
          isOpen={!!logTarget}
          title={`Histórico — ${logTarget.companyName} / ${formatMonthRef(logTarget.referenceMonth)}`}
          onClose={() => setLogTarget(null)}
          footer={<Button variant="outline" onClick={() => setLogTarget(null)}>Fechar</Button>}
        >
          {logsLoading ? <LoadingSpinner /> : !actionLogs?.length ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum evento registrado.</p>
          ) : (
            <table className="table" style={{ fontSize: '0.82rem' }}>
              <thead><tr><th>Data</th><th>Ação</th><th>Usuário</th><th>Info</th></tr></thead>
              <tbody>
                {actionLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    <td>
                      <Badge variant={log.action === 'email_sent' ? 'success' : 'secondary'}>
                        {log.action === 'email_sent' ? '📧 E-mail' : '📄 Gerado'}
                      </Badge>
                    </td>
                    <td>{log.performedByName ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {log.action === 'email_sent' && log.metadata ? String(log.metadata.to ?? '') : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}

function KpiCard({ title, value, icon, sub, danger }: { title: string; value: string; icon: string; sub?: string; danger?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${danger ? 'var(--danger-color, #dc3545)' : 'var(--border-color)'}`,
        borderRadius: 'var(--border-radius)',
        padding: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: danger ? 'var(--danger-color, #dc3545)' : 'inherit' }}>{value}</p>
          {sub && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: '1.75rem' }}>{icon}</span>
      </div>
    </div>
  )
}
