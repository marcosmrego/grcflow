import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRequireSystemAdmin } from '../../hooks/useAuth'
import { getCompany, getCompanyUsers, getCompanyModules, setCompanyModule, getCompanyInvoices, createCompanyInvoice, deleteCompanyInvoice, createCompanyAdmin } from '../../lib/api/companies'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { formatDateShort } from '../../lib/utils'

export function CompanyDetail() {
  useDocumentTitle('Detalhe Empresa')
  useRequireSystemAdmin()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'users' | 'modules' | 'invoices'>('users')
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })
  const [adminError, setAdminError] = useState<string | null>(null)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', dueDate: '', description: '', status: 'pending' })
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-company-users', id],
    queryFn: () => getCompanyUsers(id!),
    enabled: !!id && activeTab === 'users',
  })

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['admin-company-modules', id],
    queryFn: () => getCompanyModules(id!),
    enabled: !!id && activeTab === 'modules',
  })

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin-company-invoices', id],
    queryFn: () => getCompanyInvoices(id!),
    enabled: !!id && activeTab === 'invoices',
  })

  const toggleModuleMutation = useMutation({
    mutationFn: ({ key, isActive }: { key: string; isActive: boolean }) =>
      setCompanyModule(id!, key, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-company-modules', id] }),
  })

  const createAdminMutation = useMutation({
    mutationFn: () => createCompanyAdmin(id!, adminForm),
    onSuccess: () => { setAdminModalOpen(false); qc.invalidateQueries({ queryKey: ['admin-company-users', id] }); setAdminError(null) },
    onError: (err: Error) => setAdminError(err.message),
  })

  const createInvoiceMutation = useMutation({
    mutationFn: () => createCompanyInvoice(id!, { ...invoiceForm, amount: Number(invoiceForm.amount) } as never),
    onSuccess: () => { setInvoiceModalOpen(false); qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }); setInvoiceError(null) },
    onError: (err: Error) => setInvoiceError(err.message),
  })

  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => deleteCompanyInvoice(id!, invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }),
  })

  if (companyLoading) return <LoadingSpinner />
  if (!company) return <div>Empresa não encontrada</div>

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/companies')}>← Voltar</Button>
          <h1 style={{ marginTop: '0.5rem' }}>{company.name}</h1>
          <p className="subtitle"><code>{company.slug}</code> · <Badge variant={company.isActive ? 'success' : 'secondary'}>{company.isActive ? 'Ativa' : 'Inativa'}</Badge></p>
        </div>
      </div>

      <div className="tabs">
        {(['users', 'modules', 'invoices'] as const).map((t) => (
          <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'users' ? '👥 Usuários' : t === 'modules' ? '🧩 Módulos' : '💰 Faturas'}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <Card>
          <CardHeader title="Usuários" action={<Button size="sm" onClick={() => setAdminModalOpen(true)}>+ Admin Inicial</Button>} />
          <CardBody>
            {usersLoading ? <LoadingSpinner /> : (
              <table className="table">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Criado em</th></tr></thead>
                <tbody>
                  {(usersData?.items ?? []).map((u) => (
                    <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{formatDateShort(u.createdAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'modules' && (
        <Card>
          <CardHeader title="Módulos" />
          <CardBody>
            {modulesLoading ? <LoadingSpinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(modulesData ?? []).map((m) => (
                  <div key={m.moduleKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
                    <div>
                      <strong>{m.name}</strong>
                      <code style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.moduleKey}</code>
                    </div>
                    <Button
                      size="sm"
                      variant={m.isActive ? 'danger' : 'success'}
                      onClick={() => toggleModuleMutation.mutate({ key: m.moduleKey, isActive: !m.isActive })}
                    >
                      {m.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'invoices' && (
        <Card>
          <CardHeader title="Faturas" action={<Button size="sm" onClick={() => setInvoiceModalOpen(true)}>+ Nova Fatura</Button>} />
          <CardBody>
            {invoicesLoading ? <LoadingSpinner /> : (
              <table className="table">
                <thead><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {(invoicesData ?? []).map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.description ?? '—'}</td>
                      <td>R$ {Number(inv.amount).toFixed(2)}</td>
                      <td>{formatDateShort(inv.dueDate)}</td>
                      <td><Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'}>{inv.status}</Badge></td>
                      <td><Button size="sm" variant="danger" onClick={() => deleteInvoiceMutation.mutate(inv.id)}>Excluir</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* Create Admin Modal */}
      <Modal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title="Criar Admin Inicial"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAdminMutation.mutate()} loading={createAdminMutation.isPending}>Criar</Button>
          </>
        }
      >
        {adminError && <ErrorMessage message={adminError} onDismiss={() => setAdminError(null)} />}
        <div className="form-group"><label>Nome</label><input className="form-control" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} /></div>
        <div className="form-group"><label>E-mail</label><input type="email" className="form-control" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} /></div>
        <div className="form-group"><label>Senha</label><input type="password" className="form-control" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} /></div>
      </Modal>

      {/* Create Invoice Modal */}
      <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Nova Fatura"
        footer={
          <>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createInvoiceMutation.mutate()} loading={createInvoiceMutation.isPending}>Criar</Button>
          </>
        }
      >
        {invoiceError && <ErrorMessage message={invoiceError} onDismiss={() => setInvoiceError(null)} />}
        <div className="form-group"><label>Valor (R$)</label><input type="number" className="form-control" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></div>
        <div className="form-group"><label>Vencimento</label><input type="date" className="form-control" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} /></div>
        <div className="form-group"><label>Descrição</label><input className="form-control" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} /></div>
        <div className="form-group">
          <label>Status</label>
          <select className="form-control" value={invoiceForm.status} onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="overdue">Vencido</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </Modal>
    </div>
  )
}


