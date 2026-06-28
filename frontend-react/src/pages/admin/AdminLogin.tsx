import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminLogin } from '../../lib/api/auth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Button } from '../../components/ui/Button'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
type FormData = z.infer<typeof schema>

export function AdminLogin() {
  useDocumentTitle('Painel Admin — Login')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const result = await adminLogin(data.email, data.password)
      localStorage.setItem('grc_system_token', result.token)
      localStorage.setItem('grc_system_user', JSON.stringify(result.admin))
      navigate('/admin/companies', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no login')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">⚙️ GRC Plataforma</div>
        <h2 className="login-title">Painel Administrativo</h2>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" className="form-control" {...register('email')} autoComplete="email" />
            {errors.email && <small style={{ color: 'var(--danger)' }}>{errors.email.message}</small>}
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" className="form-control" {...register('password')} autoComplete="current-password" />
            {errors.password && <small style={{ color: 'var(--danger)' }}>{errors.password.message}</small>}
          </div>
          <Button type="submit" loading={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}

