import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { getFlows, createFlow, updateFlow, deleteFlow, addFlowStep, deleteFlowStep } from '../lib/api/flows'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { formatDateShort, getStatusLabel } from '../lib/utils'
import type { Flow, FlowStep } from '../types'

const flowSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
})

const stepSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  type: z.enum(['action', 'decision', 'wait', 'notification']),
})

type FlowForm = z.infer<typeof flowSchema>
type StepForm = z.infer<typeof stepSchema>

const TABS = ['Todos', 'Rascunho', 'Publicado', 'Arquivado'] as const
const TAB_STATUS = { Todos: '', Rascunho: 'draft', Publicado: 'published', Arquivado: 'archived' } as const

export function Flows() {
  useDocumentTitle('Fluxos')
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Todos')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailFlow, setDetailFlow] = useState<Flow | null>(null)
  const [editing, setEditing] = useState<Flow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)

  const statusFilter = TAB_STATUS[activeTab]

  const { data: flowsRes, isLoading } = useQuery({
    queryKey: ['flows', statusFilter],
    queryFn: () => getFlows(statusFilter || undefined),
  })

  const flows = (flowsRes?.data ?? []).filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  const { register: regFlow, handleSubmit: handleFlowSubmit, reset: resetFlow, formState: { errors: flowErrors, isSubmitting: flowSubmitting } } = useForm<FlowForm>({
    resolver: zodResolver(flowSchema),
    defaultValues: { status: 'draft' }
  })

  const { register: regStep, handleSubmit: handleStepSubmit, reset: resetStep, formState: { errors: stepErrors, isSubmitting: stepSubmitting } } = useForm<StepForm>({
    resolver: zodResolver(stepSchema),
    defaultValues: { type: 'action' }
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Flow>) => createFlow(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); closeModal() },
    onError: (err: Error) => setFormError(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Flow> }) => updateFlow(id, data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['flows'] }); setDetailFlow(res.data); closeModal() },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFlow(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); setDeleteTarget(null); if (detailFlow?.id === deleteTarget) setDetailFlow(null) },
  })

  const addStepMutation = useMutation({
    mutationFn: ({ flowId, data }: { flowId: string; data: Partial<FlowStep> }) => addFlowStep(flowId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['flows'] })
      if (detailFlow) {
        setDetailFlow({ ...detailFlow, steps: [...detailFlow.steps, res.data] })
      }
      resetStep()
      setAddingStep(false)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const deleteStepMutation = useMutation({
    mutationFn: ({ flowId, stepId }: { flowId: string; stepId: string }) => deleteFlowStep(flowId, stepId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['flows'] })
      if (detailFlow) {
        setDetailFlow({ ...detailFlow, steps: detailFlow.steps.filter((s) => s.id !== vars.stepId) })
      }
    },
  })

  const openCreate = () => {
    setEditing(null)
    resetFlow({ status: 'draft' })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (flow: Flow) => {
    setEditing(flow)
    resetFlow({ name: flow.name, description: flow.description ?? '', status: flow.status })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null); setFormError(null) }

  const onFlowSubmit = (data: FlowForm) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const onStepSubmit = (data: StepForm) => {
    if (!detailFlow) return
    addStepMutation.mutate({ flowId: detailFlow.id, data: { ...data, order: detailFlow.steps.length + 1 } })
  }

  const stepTypeLabel = (t: string) => ({ action: 'Ação', decision: 'Decisão', wait: 'Aguardar', notification: 'Notificação' }[t] ?? t)

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>🔄 Fluxos de Processos</h1>
          <p className="subtitle">Modelagem e gerenciamento de fluxos</p>
        </div>
        <div className="header-actions">
          <Button onClick={openCreate}>+ Novo Fluxo</Button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button key={tab} className={`tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input className="form-control search-input" placeholder="Buscar fluxo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? <LoadingSpinner /> : flows.length === 0 ? (
        <EmptyState icon="🔄" title="Nenhum fluxo encontrado" description="Crie seu primeiro fluxo clicando em '+ Novo Fluxo'" />
      ) : (
        <div className="flow-grid">
          {flows.map((flow) => (
            <div key={flow.id} className="flow-card">
              <div className="flow-header">
                <div className="flow-info">
                  <div className="flow-name">{flow.name}</div>
                  {flow.description && <div className="flow-description">{flow.description}</div>}
                  <div className="flow-meta">
                    <Badge status={flow.status}>{getStatusLabel(flow.status)}</Badge>
                    <span>{flow.steps.length} etapas</span>
                    <span>{formatDateShort(flow.updatedAt)}</span>
                  </div>
                </div>
                <div className="flow-actions">
                  <button className="flow-action-btn" title="Ver detalhes" onClick={() => setDetailFlow(flow)}>👁️</button>
                  <button className="flow-action-btn" title="Editar" onClick={() => openEdit(flow)}>✏️</button>
                  <button className="flow-action-btn" title="Excluir" onClick={() => setDeleteTarget(flow.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Fluxo' : 'Novo Fluxo'}
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="flow-form" loading={flowSubmitting || createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="flow-form" onSubmit={handleFlowSubmit(onFlowSubmit)} noValidate>
          <div className="form-group">
            <label>Nome *</label>
            <input className="form-control" {...regFlow('name')} />
            {flowErrors.name && <small style={{ color: 'var(--danger)' }}>{flowErrors.name.message}</small>}
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea className="form-control" rows={3} {...regFlow('description')} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" {...regFlow('status')}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {detailFlow && (
        <Modal
          isOpen={!!detailFlow}
          onClose={() => { setDetailFlow(null); setAddingStep(false) }}
          title={detailFlow.name}
          size="lg"
          footer={<Button variant="outline" onClick={() => { setDetailFlow(null); setAddingStep(false) }}>Fechar</Button>}
        >
          <div style={{ marginBottom: '1rem' }}>
            <Badge status={detailFlow.status}>{getStatusLabel(detailFlow.status)}</Badge>
            {detailFlow.description && <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{detailFlow.description}</p>}
          </div>

          <h3 style={{ marginBottom: '1rem' }}>Etapas ({detailFlow.steps.length})</h3>
          <div className="steps-container">
            {detailFlow.steps.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhuma etapa adicionada.</p>}
            {[...detailFlow.steps].sort((a, b) => a.order - b.order).map((step) => (
              <div key={step.id} className={`step-item step-type-${step.type}`}>
                <div className="step-number">{step.order}</div>
                <div className="step-info">
                  <div className="step-title">{step.title}</div>
                  {step.description && <div className="step-description">{step.description}</div>}
                  <span className="step-type-badge badge badge-secondary">{stepTypeLabel(step.type)}</span>
                </div>
                <button
                  className="flow-action-btn"
                  title="Remover etapa"
                  onClick={() => deleteStepMutation.mutate({ flowId: detailFlow.id, stepId: step.id })}
                >🗑️</button>
              </div>
            ))}
          </div>

          {addingStep ? (
            <form onSubmit={handleStepSubmit(onStepSubmit)} style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)' }}>
              <h4 style={{ marginBottom: '1rem' }}>Nova Etapa</h4>
              {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
              <div className="form-group">
                <label>Título *</label>
                <input className="form-control" {...regStep('title')} />
                {stepErrors.title && <small style={{ color: 'var(--danger)' }}>{stepErrors.title.message}</small>}
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea className="form-control" rows={2} {...regStep('description')} />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="form-control" {...regStep('type')}>
                  <option value="action">Ação</option>
                  <option value="decision">Decisão</option>
                  <option value="wait">Aguardar</option>
                  <option value="notification">Notificação</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="submit" size="sm" loading={stepSubmitting || addStepMutation.isPending}>Adicionar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setAddingStep(false); resetStep() }}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingStep(true)} style={{ marginTop: '1rem' }}>+ Adicionar Etapa</Button>
          )}
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Excluir Fluxo"
        message="Tem certeza que deseja excluir este fluxo e todas as suas etapas?"
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}


