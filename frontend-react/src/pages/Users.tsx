import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRequireAdmin } from '../hooks/useAuth'
import { getUsers, createUser, updateUser, deleteUser } from '../lib/api/users'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatDateShort } from '../lib/utils'
import type { User } from '../types'

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['admin', 'editor', 'viewer']),
  approvalGroup: z.enum(['technical', 'compliance', 'final', '']).optional(),
})

const editSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  role: z.enum(['admin', 'editor', 'viewer']),
  approvalGroup: z.enum(['technical', 'compliance', 'final', '']).optional(),
  isActive: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

const roleLabels: Record<string, string> = { admin: 'Admin', editor: 'Editor', viewer: 'Visualizador' }
const approvalLabels: Record<string, string> = { technical: 'Técnico', compliance: 'Compliance', final: 'Final' }

export function Users() {
  useDocumentTitle('Usuários')
  useRequireAdmin()
  const qc = useQueryClient()
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState('')
  const [search, setSearch] = useState('')

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const users = (usersRes?.data?.items ?? []).filter((u) => {
    if (filterRole && u.role !== filterRole) return false
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: ce, isSubmitting: cs } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema), defaultValues: { role: 'viewer' }
  })

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, formState: { errors: ee, isSubmitting: es } } = useForm<EditForm>({
    resolver: zodResolver(editSchema)
  })

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => createUser(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalMode(null); setFormError(null) },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalMode(null); setFormError(null) },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { resetCreate({ role: 'viewer' }); setFormError(null); setModalMode('create') }
  const openEdit = (u: User) => {
    setEditingUser(u)
    resetEdit({ name: u.name, role: u.role, approvalGroup: u.approvalGroup ?? '', isActive: u.isActive })
    setFormError(null)
    setModalMode('edit')
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>👥 Usuários</h1>
          <p className="subtitle">Gerenciamento de usuários da empresa</p>
        </div>
        <div className="header-actions">
          <Button onClick={openCreate}>+ Novo Usuário</Button>
        </div>
      </div>

      <Card>
        <CardHeader title={`Usuários (${users.length})`} />
        <CardBody>
          <div className="filters-bar">
            <input className="form-control search-input" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-control" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">Todos os perfis</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>

          {isLoading ? <LoadingSpinner /> : users.length === 0 ? (
            <EmptyState icon="👥" title="Nenhum usuário encontrado" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Grupo Aprovação</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><Badge variant={u.role === 'admin' ? 'danger' : u.role === 'editor' ? 'primary' : 'secondary'}>{roleLabels[u.role] ?? u.role}</Badge></td>
                    <td>{u.approvalGroup ? approvalLabels[u.approvalGroup] ?? u.approvalGroup : '—'}</td>
                    <td><Badge variant={u.isActive ? 'success' : 'secondary'}>{u.isActive ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td>{formatDateShort(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(u.id)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={modalMode === 'create'}
        onClose={() => setModalMode(null)}
        title="Novo Usuário"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalMode(null)}>Cancelar</Button>
            <Button type="submit" form="create-user-form" loading={cs || createMutation.isPending}>Criar</Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="create-user-form" onSubmit={handleCreate((d) => createMutation.mutate(d))} noValidate>
          <div className="form-group">
            <label>Nome *</label>
            <input className="form-control" {...regCreate('name')} />
            {ce.name && <small style={{ color: 'var(--danger)' }}>{ce.name.message}</small>}
          </div>
          <div className="form-group">
            <label>E-mail *</label>
            <input type="email" className="form-control" {...regCreate('email')} />
            {ce.email && <small style={{ color: 'var(--danger)' }}>{ce.email.message}</small>}
          </div>
          <div className="form-group">
            <label>Senha *</label>
            <input type="password" className="form-control" {...regCreate('password')} />
            {ce.password && <small style={{ color: 'var(--danger)' }}>{ce.password.message}</small>}
          </div>
          <div className="form-group">
            <label>Perfil</label>
            <select className="form-control" {...regCreate('role')}>
              <option value="viewer">Visualizador</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={modalMode === 'edit'}
        onClose={() => setModalMode(null)}
        title="Editar Usuário"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalMode(null)}>Cancelar</Button>
            <Button type="submit" form="edit-user-form" loading={es || updateMutation.isPending}>Salvar</Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="edit-user-form" onSubmit={handleEdit((d) => editingUser && updateMutation.mutate({ id: editingUser.id, data: { ...d, approvalGroup: (d.approvalGroup || undefined) as 'technical' | 'compliance' | 'final' | undefined } }))} noValidate>
          <div className="form-group">
            <label>Nome *</label>
            <input className="form-control" {...regEdit('name')} />
            {ee.name && <small style={{ color: 'var(--danger)' }}>{ee.name.message}</small>}
          </div>
          <div className="form-group">
            <label>Perfil</label>
            <select className="form-control" {...regEdit('role')}>
              <option value="viewer">Visualizador</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Grupo de Aprovação</label>
            <select className="form-control" {...regEdit('approvalGroup')}>
              <option value="">— Nenhum —</option>
              <option value="technical">Técnico</option>
              <option value="compliance">Compliance</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" {...regEdit('isActive')} />
              Usuário ativo
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}



