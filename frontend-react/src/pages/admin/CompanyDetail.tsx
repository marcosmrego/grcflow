import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRequireSystemAdmin } from '../../hooks/useAuth'
import {
  getCompany, updateCompany,
  getCompanyUsers, getCompanyModules, setCompanyModule,
  getCompanyInvoices, createCompanyInvoice, deleteCompanyInvoice, updateCompanyInvoice,
  sendInvoiceEmail, getInvoiceActionLogs,
  createCompanyAdmin,
} from '../../lib/api/companies'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { formatDateShort } from '../../lib/utils'
import type { Company, InvoiceActionLog, Invoice } from '../../types'

type Tab = 'data' | 'users' | 'modules' | 'invoices'

const TAB_LABELS: Record<Tab, string> = {
  data: '📋 Dados',
  users: '👥 Usuários',
  modules: '🧩 Módulos',
  invoices: '💰 Faturas',
}

function getIsMaster(): boolean {
  try {
    const raw = localStorage.getItem('grc_system_user')
    return raw ? (JSON.parse(raw) as { isMaster?: boolean }).isMaster === true : false
  } catch { return false }
}

function emptyEditForm(c: Company) {
  return {
    name: c.name,
    document: c.document ?? '',
    legalName: c.legalName ?? '',
    segment: c.segment ?? '',
    website: c.website ?? '',
    contactName: c.contactName ?? '',
    contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    zipCode: c.zipCode ?? '',
    monthlyFee: c.monthlyFee != null ? String(c.monthlyFee) : '',
    notes: c.notes ?? '',
    isActive: c.isActive,
  }
}

type EditForm = ReturnType<typeof emptyEditForm>

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 500 }}>{value || <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>—</span>}</dd>
    </div>
  )
}

export function CompanyDetail() {
  useDocumentTitle('Detalhe Empresa')
  useRequireSystemAdmin()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMaster = getIsMaster()

  const [activeTab, setActiveTab] = useState<Tab>('data')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })
  const [adminError, setAdminError] = useState<string | null>(null)

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ referenceMonth: '', amount: '', dueDate: '', notes: '' })
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [logTarget, setLogTarget] = useState<Invoice | null>(null)
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)

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

  const updateMutation = useMutation({
    mutationFn: () => {
      const f = editForm!
      return updateCompany(id!, {
        name: f.name,
        document: f.document || undefined,
        is_active: f.isActive,
        legalName: f.legalName || undefined,
        segment: f.segment || undefined,
        website: f.website || undefined,
        contactName: f.contactName || undefined,
        contactEmail: f.contactEmail || undefined,
        contactPhone: f.contactPhone || undefined,
        address: f.address || undefined,
        city: f.city || undefined,
        state: f.state || undefined,
        zipCode: f.zipCode || undefined,
        monthlyFee: f.monthlyFee !== '' ? Number(f.monthlyFee) : null,
        notes: f.notes || undefined,
      })
    },
    onSuccess: () => {
      setIsEditing(false)
      setEditError(null)
      qc.invalidateQueries({ queryKey: ['admin-company', id] })
    },
    onError: (err: Error) => setEditError(err.message),
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
    mutationFn: () => createCompanyInvoice(id!, {
      referenceMonth: invoiceForm.referenceMonth + '-01',
      amount: Number(invoiceForm.amount),
      dueDate: invoiceForm.dueDate,
      notes: invoiceForm.notes || undefined,
    }),
    onSuccess: () => { setInvoiceModalOpen(false); qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }); setInvoiceError(null) },
    onError: (err: Error) => setInvoiceError(err.message),
  })

  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => deleteCompanyInvoice(id!, invoiceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (invoiceId: string) => {
      setSendingInvoiceId(invoiceId)
      return sendInvoiceEmail(id!, invoiceId)
    },
    onSettled: () => setSendingInvoiceId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }),
    onError: (err: Error) => alert(`Erro ao enviar e-mail: ${err.message}`),
  })

  const { data: actionLogs, isLoading: logsLoading } = useQuery<InvoiceActionLog[]>({
    queryKey: ['invoice-logs', id, logTarget?.id],
    queryFn: () => getInvoiceActionLogs(id!, logTarget!.id),
    enabled: !!logTarget,
  })

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) => updateCompanyInvoice(id!, invoiceId, { status: 'paid' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-company-invoices', id] }),
  })

  if (companyLoading) return <LoadingSpinner />
  if (!company) return <div>Empresa não encontrada</div>

  const f = editForm

  function handleEdit() {
    setEditForm(emptyEditForm(company!))
    setIsEditing(true)
    setEditError(null)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setEditForm(null)
    setEditError(null)
  }

  function setF(partial: Partial<EditForm>) {
    setEditForm((prev) => prev ? { ...prev, ...partial } : prev)
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/companies')}>← Voltar</Button>
          <h1 style={{ marginTop: '0.5rem' }}>{company.name}</h1>
          <p className="subtitle">
            <code>{company.slug}</code>
            {' · '}
            <Badge variant={company.isActive ? 'success' : 'secondary'}>{company.isActive ? 'Ativa' : 'Inativa'}</Badge>
          </p>
        </div>
      </div>

      <div className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ─── ABA DADOS ─── */}
      {activeTab === 'data' && (
        <Card>
          <CardHeader
            title="Dados da Empresa"
            action={
              isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancelar</Button>
                  <Button size="sm" onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>Salvar</Button>
                </div>
              ) : (
                <Button size="sm" onClick={handleEdit}>Editar</Button>
              )
            }
          />
          <CardBody>
            {editError && <ErrorMessage message={editError} onDismiss={() => setEditError(null)} />}

            {isEditing && f ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Section title="Básico">
                  <FormRow>
                    <FormField label="Nome *">
                      <input className="form-control" value={f.name} onChange={(e) => setF({ name: e.target.value })} />
                    </FormField>
                    <FormField label="Razão Social">
                      <input className="form-control" value={f.legalName} onChange={(e) => setF({ legalName: e.target.value })} />
                    </FormField>
                    <FormField label="CNPJ / Documento">
                      <input className="form-control" value={f.document} onChange={(e) => setF({ document: e.target.value })} />
                    </FormField>
                    <FormField label="Segmento">
                      <input className="form-control" value={f.segment} onChange={(e) => setF({ segment: e.target.value })} />
                    </FormField>
                  </FormRow>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <input type="checkbox" id="isActive" checked={f.isActive} onChange={(e) => setF({ isActive: e.target.checked })} />
                    <label htmlFor="isActive" style={{ cursor: 'pointer', marginBottom: 0 }}>Empresa ativa</label>
                  </div>
                </Section>

                <Section title="Contato">
                  <FormRow>
                    <FormField label="Nome do Contato">
                      <input className="form-control" value={f.contactName} onChange={(e) => setF({ contactName: e.target.value })} />
                    </FormField>
                    <FormField label="E-mail do Contato">
                      <input type="email" className="form-control" value={f.contactEmail} onChange={(e) => setF({ contactEmail: e.target.value })} />
                    </FormField>
                    <FormField label="Telefone">
                      <input className="form-control" value={f.contactPhone} onChange={(e) => setF({ contactPhone: e.target.value })} />
                    </FormField>
                    <FormField label="Site">
                      <input className="form-control" placeholder="https://..." value={f.website} onChange={(e) => setF({ website: e.target.value })} />
                    </FormField>
                  </FormRow>
                </Section>

                <Section title="Endereço">
                  <FormRow>
                    <FormField label="Endereço" wide>
                      <input className="form-control" value={f.address} onChange={(e) => setF({ address: e.target.value })} />
                    </FormField>
                    <FormField label="Cidade">
                      <input className="form-control" value={f.city} onChange={(e) => setF({ city: e.target.value })} />
                    </FormField>
                    <FormField label="UF">
                      <input className="form-control" maxLength={2} style={{ textTransform: 'uppercase' }} value={f.state} onChange={(e) => setF({ state: e.target.value.toUpperCase() })} />
                    </FormField>
                    <FormField label="CEP">
                      <input className="form-control" value={f.zipCode} onChange={(e) => setF({ zipCode: e.target.value })} />
                    </FormField>
                  </FormRow>
                </Section>

                {isMaster && (
                  <Section title="Financeiro">
                    <FormRow>
                      <FormField label="Mensalidade (R$)">
                        <input type="number" step="0.01" min="0" className="form-control" value={f.monthlyFee} onChange={(e) => setF({ monthlyFee: e.target.value })} />
                      </FormField>
                    </FormRow>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label>Observações internas</label>
                      <textarea className="form-control" rows={3} value={f.notes} onChange={(e) => setF({ notes: e.target.value })} />
                    </div>
                  </Section>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Section title="Básico">
                  <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
                    <Field label="Nome" value={company.name} />
                    <Field label="Razão Social" value={company.legalName} />
                    <Field label="Slug" value={company.slug} />
                    <Field label="CNPJ / Documento" value={company.document} />
                    <Field label="Segmento" value={company.segment} />
                    <Field label="Site" value={company.website} />
                    <Field label="Criada em" value={formatDateShort(company.createdAt)} />
                    <div>
                      <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>Status</dt>
                      <dd style={{ margin: 0 }}><Badge variant={company.isActive ? 'success' : 'secondary'}>{company.isActive ? 'Ativa' : 'Inativa'}</Badge></dd>
                    </div>
                  </dl>
                </Section>

                <Section title="Contato">
                  <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
                    <Field label="Nome" value={company.contactName} />
                    <Field label="E-mail" value={company.contactEmail} />
                    <Field label="Telefone" value={company.contactPhone} />
                  </dl>
                </Section>

                <Section title="Endereço">
                  <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
                    <Field label="Endereço" value={company.address} />
                    <Field label="Cidade" value={company.city} />
                    <Field label="Estado" value={company.state} />
                    <Field label="CEP" value={company.zipCode} />
                  </dl>
                </Section>

                {isMaster && (
                  <Section title="Financeiro">
                    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
                      <Field
                        label="Mensalidade"
                        value={company.monthlyFee != null
                          ? company.monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : null}
                      />
                      <Field label="Observações" value={company.notes} />
                    </dl>
                  </Section>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ─── ABA USUÁRIOS ─── */}
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

      {/* ─── ABA MÓDULOS ─── */}
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

      {/* ─── ABA FATURAS ─── */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader title="Faturas" action={
            <Button size="sm" onClick={() => {
              setInvoiceForm({
                referenceMonth: '',
                amount: company.monthlyFee != null ? String(company.monthlyFee) : '',
                dueDate: '',
                notes: '',
              })
              setInvoiceModalOpen(true)
            }}>+ Nova Fatura</Button>
          } />
          <CardBody>
            {invoicesLoading ? <LoadingSpinner /> : (
              <table className="table">
                <thead><tr><th>Observações</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>E-mail</th><th>Ações</th></tr></thead>
                <tbody>
                  {(invoicesData ?? []).map((inv) => {
                    const hasEmail = !!company.contactEmail
                    const isSending = sendingInvoiceId === inv.id
                    return (
                      <tr key={inv.id}>
                        <td>{inv.notes ?? '—'}</td>
                        <td>R$ {Number(inv.amount).toFixed(2)}</td>
                        <td>{formatDateShort(inv.dueDate)}</td>
                        <td><Badge variant={inv.displayStatus === 'paid' ? 'success' : inv.displayStatus === 'overdue' ? 'danger' : 'warning'}>{inv.displayStatus}</Badge></td>
                        <td>
                          {inv.sentAt ? (
                            <div>
                              <Badge variant="success">Enviado</Badge>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{formatDateShort(inv.sentAt)}</div>
                              <Button size="sm" variant="outline" style={{ marginTop: '4px' }} loading={isSending} onClick={() => sendEmailMutation.mutate(inv.id)}>Reenviar</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant={hasEmail ? 'primary' : 'outline'} disabled={!hasEmail} loading={isSending} title={!hasEmail ? 'Sem e-mail de contato cadastrado' : ''} onClick={() => sendEmailMutation.mutate(inv.id)}>
                              📧 Enviar
                            </Button>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {(inv.displayStatus === 'pending' || inv.displayStatus === 'overdue') && (
                              <Button size="sm" variant="success" onClick={() => markPaidMutation.mutate(inv.id)}>Pago</Button>
                            )}
                            <Button size="sm" variant="outline" title="Histórico" onClick={() => setLogTarget(inv)}>📋</Button>
                            <Button size="sm" variant="danger" onClick={() => deleteInvoiceMutation.mutate(inv.id)}>✕</Button>
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
      )}

      {/* Modal Criar Admin */}
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

      {/* Modal Nova Fatura */}
      <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Nova Fatura"
        footer={
          <>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => createInvoiceMutation.mutate()} loading={createInvoiceMutation.isPending}>Criar</Button>
          </>
        }
      >
        {invoiceError && <ErrorMessage message={invoiceError} onDismiss={() => setInvoiceError(null)} />}
        <div className="form-group">
          <label>Mês de Referência *</label>
          <input
            type="month"
            className="form-control"
            value={invoiceForm.referenceMonth}
            onChange={(e) => {
              const month = e.target.value
              let notes = invoiceForm.notes
              if (month) {
                const [y, m] = month.split('-').map(Number)
                const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
                notes = `Faturamento referente ao mês de ${label}`
              }
              setInvoiceForm({ ...invoiceForm, referenceMonth: month, notes })
            }}
          />
        </div>
        <div className="form-group"><label>Valor (R$) *</label><input type="number" step="0.01" min="0" className="form-control" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></div>
        <div className="form-group">
          <label>Vencimento *</label>
          <input
            type="date"
            className="form-control"
            value={invoiceForm.dueDate}
            min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
          />
        </div>
        <div className="form-group"><label>Observações</label><input className="form-control" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
      </Modal>

      {/* ─── MODAL HISTÓRICO ─── */}
      {logTarget && (
        <Modal
          isOpen={!!logTarget}
          title={`Histórico — ${logTarget.notes ?? logTarget.referenceMonth}`}
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
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateShort(log.createdAt)}</td>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>{title}</h4>
      {children}
    </div>
  )
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>{children}</div>
}

function FormField({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="form-group" style={{ margin: 0, gridColumn: wide ? 'span 2' : undefined }}>
      <label style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.85rem' }}>{label}</label>
      {children}
    </div>
  )
}
