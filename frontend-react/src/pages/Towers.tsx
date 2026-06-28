import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRequireAdmin } from '../hooks/useAuth'
import { getTowers, createTower, updateTower, deleteTower } from '../lib/api/towers'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatDateShort } from '../lib/utils'
import type { Tower } from '../types'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  abbreviation: z.string().min(1, 'Abreviação obrigatória').max(10),
})
type FormData = z.infer<typeof schema>

export function Towers() {
  useDocumentTitle('Torres')
  useRequireAdmin()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Tower | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: towersRes, isLoading } = useQuery({ queryKey: ['towers'], queryFn: getTowers })
  const towers = towersRes?.data ?? []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => createTower(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['towers'] }); setModalOpen(false); setFormError(null) },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tower> }) => updateTower(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['towers'] }); setModalOpen(false); setFormError(null) },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTower(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['towers'] }); setDeleteTarget(null) },
  })

  const openCreate = () => { setEditing(null); reset(); setFormError(null); setModalOpen(true) }
  const openEdit = (t: Tower) => { setEditing(t); reset({ name: t.name, abbreviation: t.abbreviation }); setFormError(null); setModalOpen(true) }
  const onSubmit = (d: FormData) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: d })
    else createMutation.mutate(d)
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>🏢 Torres</h1>
          <p className="subtitle">Gerenciamento de torres/departamentos</p>
        </div>
        <div className="header-actions">
          <Button onClick={openCreate}>+ Nova Torre</Button>
        </div>
      </div>

      <Card>
        <CardHeader title={`Torres (${towers.length})`} />
        <CardBody>
          {isLoading ? <LoadingSpinner /> : towers.length === 0 ? (
            <EmptyState icon="🏢" title="Nenhuma torre encontrada" description="Crie a primeira torre clicando em '+ Nova Torre'" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Abreviação</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {towers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td><Badge variant="primary">{t.abbreviation}</Badge></td>
                    <td><Badge variant={t.isActive ? 'success' : 'secondary'}>{t.isActive ? 'Ativa' : 'Inativa'}</Badge></td>
                    <td>{formatDateShort(t.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(t.id)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Torre' : 'Nova Torre'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="tower-form" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="tower-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Nome *</label>
            <input className="form-control" {...register('name')} />
            {errors.name && <small style={{ color: 'var(--danger)' }}>{errors.name.message}</small>}
          </div>
          <div className="form-group">
            <label>Abreviação *</label>
            <input className="form-control" {...register('abbreviation')} maxLength={10} />
            {errors.abbreviation && <small style={{ color: 'var(--danger)' }}>{errors.abbreviation.message}</small>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Excluir Torre"
        message="Tem certeza que deseja excluir esta torre?"
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

