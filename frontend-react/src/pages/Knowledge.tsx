import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getKnowledge, getKnowledgeStats, createKnowledge, updateKnowledge, deleteKnowledge, searchKnowledge } from '../lib/api/knowledge'
import { getTowers } from '../lib/api/towers'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { RichTextEditor } from '../components/ui/RichTextEditor'
import { formatDateShort, getStatusLabel, getDocTypeLabel, getConfidentialityLabel } from '../lib/utils'
import type { KnowledgeItem } from '../types'

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria obrigatória'),
  docType: z.enum(['ARTICLE', 'POL', 'POP', 'IOP', 'FOR', 'FLU']),
  confidentiality: z.enum(['publico', 'interno', 'restrito', 'confidencial']),
  validityDays: z.number().int().min(1),
  towerId: z.string().optional(),
  tags: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function Knowledge() {
  useDocumentTitle('Base de Conhecimento')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeItem | null>(null)
  const [content, setContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: statsRes } = useQuery({ queryKey: ['knowledge-stats'], queryFn: getKnowledgeStats })
  const { data: towersRes } = useQuery({ queryKey: ['towers'], queryFn: getTowers })

  const { data: kbRes, isLoading } = useQuery({
    queryKey: ['knowledge', debouncedSearch],
    queryFn: () => debouncedSearch ? searchKnowledge(debouncedSearch) : getKnowledge({ limit: 100 }),
  })

  const items = (kbRes?.data ?? []).filter((item) => {
    if (filterStatus && item.status !== filterStatus) return false
    if (filterCategory && item.category !== filterCategory) return false
    return true
  })

  const categories = Array.from(new Set((kbRes?.data ?? []).map((i) => i.category).filter(Boolean)))
  const stats = statsRes?.data
  const towers = towersRes?.data ?? []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { docType: 'ARTICLE', confidentiality: 'interno', validityDays: 365 }
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<KnowledgeItem>) => createKnowledge(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); qc.invalidateQueries({ queryKey: ['knowledge-stats'] }); closeModal() },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeItem> }) => updateKnowledge(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); closeModal() },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['knowledge'] }); qc.invalidateQueries({ queryKey: ['knowledge-stats'] }); setDeleteTarget(null) },
  })

  const openCreate = () => {
    setEditing(null)
    setContent('')
    reset({ docType: 'ARTICLE', confidentiality: 'interno', validityDays: 365 })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (item: KnowledgeItem) => {
    setEditing(item)
    setContent(item.content ?? '')
    reset({
      title: item.title,
      description: item.description ?? '',
      category: item.category,
      docType: item.docType,
      confidentiality: item.confidentiality,
      validityDays: item.validityDays,
      towerId: item.towerId ?? '',
      tags: item.tags.join(', '),
    })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null); setFormError(null) }

  const onSubmit = (data: FormData) => {
    const payload: Partial<KnowledgeItem> = {
      ...data,
      content,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      towerId: data.towerId || undefined,
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>📚 Base de Conhecimento</h1>
          <p className="subtitle">Gerenciamento de documentos e políticas</p>
        </div>
        <div className="header-actions">
          <Button onClick={openCreate}>+ Novo Item</Button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="📋" label="Total" value={stats?.total ?? 0} iconClass="knowledge" />
        <StatCard icon="✅" label="Em Dia" value={stats?.current ?? 0} iconClass="published" />
        <StatCard icon="⚠️" label="Alerta (≤30 dias)" value={stats?.alert ?? 0} iconClass="draft" />
        <StatCard icon="❌" label="Vencidos" value={stats?.expired ?? 0} iconClass="flows" />
      </div>

      <Card>
        <CardHeader title="Documentos" />
        <CardBody>
          <div className="filters-bar">
            <input
              className="form-control search-input"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="form-control" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {['draft','published','archived','in_review','pending_approval','expired'].map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>
          </div>

          {isLoading ? <LoadingSpinner /> : items.length === 0 ? (
            <EmptyState icon="📭" title="Nenhum item encontrado" description="Crie seu primeiro documento clicando em '+ Novo Item'" />
          ) : (
            <div className="items-list">
              {items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-info">
                    <div className="item-title">
                      {item.title}
                      <Badge status={item.status}>{getStatusLabel(item.status)}</Badge>
                      <span className="badge badge-secondary">{getDocTypeLabel(item.docType)}</span>
                    </div>
                    {item.description && <div className="item-description">{item.description}</div>}
                    <div className="item-meta">
                      <span>📁 {item.category}</span>
                      <span>🔒 {getConfidentialityLabel(item.confidentiality)}</span>
                      <span>📅 {formatDateShort(item.updatedAt)}</span>
                      {item.createdByName && <span>👤 {item.createdByName}</span>}
                    </div>
                    {item.tags.length > 0 && (
                      <div>{item.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                    )}
                  </div>
                  <div className="item-actions">
                    <button className="item-action" title="Editar" onClick={() => openEdit(item)}>✏️</button>
                    <button className="item-action" title="Excluir" onClick={() => setDeleteTarget(item.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Item' : 'Novo Item de Conhecimento'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="kb-form" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="kb-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Título *</label>
            <input className="form-control" {...register('title')} />
            {errors.title && <small style={{ color: 'var(--danger)' }}>{errors.title.message}</small>}
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea className="form-control" rows={2} {...register('description')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Categoria *</label>
              <input className="form-control" {...register('category')} />
              {errors.category && <small style={{ color: 'var(--danger)' }}>{errors.category.message}</small>}
            </div>
            <div className="form-group">
              <label>Tipo de Documento *</label>
              <select className="form-control" {...register('docType')}>
                {['ARTICLE','POL','POP','IOP','FOR','FLU'].map((t) => (
                  <option key={t} value={t}>{getDocTypeLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Torre</label>
              <select className="form-control" {...register('towerId')}>
                <option value="">— Nenhuma —</option>
                {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Confidencialidade *</label>
              <select className="form-control" {...register('confidentiality')}>
                {['publico','interno','restrito','confidencial'].map((c) => (
                  <option key={c} value={c}>{getConfidentialityLabel(c)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Validade (dias) *</label>
              <input type="number" className="form-control" {...register('validityDays')} />
              {errors.validityDays && <small style={{ color: 'var(--danger)' }}>{errors.validityDays.message}</small>}
            </div>
            <div className="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input className="form-control" {...register('tags')} placeholder="ex: segurança, LGPD, compliance" />
            </div>
          </div>
          <div className="form-group">
            <label>Conteúdo</label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}


