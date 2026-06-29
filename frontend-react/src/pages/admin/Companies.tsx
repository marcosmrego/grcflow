import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useRequireSystemAdmin } from '../../hooks/useAuth'
import { getCompanies, createCompany } from '../../lib/api/companies'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { formatDateShort } from '../../lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})
type FormData = z.infer<typeof schema>

export function Companies() {
  useDocumentTitle('Empresas — Admin')
  useRequireSystemAdmin()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: companiesRes, isLoading } = useQuery({
    queryKey: ['admin-companies', search],
    queryFn: () => getCompanies(1, 50, search),
  })

  const companies = companiesRes?.items ?? []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => createCompany(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-companies'] }); setModalOpen(false); reset(); setFormError(null) },
    onError: (err: Error) => setFormError(err.message),
  })

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>🏢 Empresas</h1>
          <p className="subtitle">Gerenciamento de empresas na plataforma</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => { reset(); setFormError(null); setModalOpen(true) }}>+ Nova Empresa</Button>
        </div>
      </div>

      <Card>
        <CardHeader title={`Empresas (${companies.length})`} />
        <CardBody>
          <div className="filters-bar">
            <input className="form-control search-input" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {isLoading ? <LoadingSpinner /> : companies.length === 0 ? (
            <EmptyState icon="🏢" title="Nenhuma empresa encontrada" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td><code>{c.slug}</code></td>
                    <td><Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Ativa' : 'Inativa'}</Badge></td>
                    <td>{formatDateShort(c.createdAt)}</td>
                    <td>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/companies/${c.id}`)}>Detalhes</Button>
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
        title="Nova Empresa"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" form="company-form" loading={isSubmitting || createMutation.isPending}>Criar</Button>
          </>
        }
      >
        {formError && <ErrorMessage message={formError} onDismiss={() => setFormError(null)} />}
        <form id="company-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} noValidate>
          <div className="form-group">
            <label>Nome *</label>
            <input className="form-control" {...register('name')} />
            {errors.name && <small style={{ color: 'var(--danger)' }}>{errors.name.message}</small>}
          </div>
          <div className="form-group">
            <label>Slug *</label>
            <input className="form-control" {...register('slug')} placeholder="ex: minha-empresa" />
            {errors.slug && <small style={{ color: 'var(--danger)' }}>{errors.slug.message}</small>}
          </div>
        </form>
      </Modal>
    </div>
  )
}

