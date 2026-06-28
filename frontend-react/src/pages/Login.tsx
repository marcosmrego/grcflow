import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login } from '../lib/api/auth'
import { useAuthStore } from '../store/authStore'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/ui/ErrorMessage'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

type FormData = z.infer<typeof schema>

export function Login() {
  useDocumentTitle('Login')
  const navigate = useNavigate()
  const authLogin = useAuthStore((s) => s.login)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const result = await login(data.email, data.password)
      authLogin(result.accessToken, result.user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao fazer login')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🛡️ GRC Flow</div>
        <h2 className="login-title">Entrar na plataforma</h2>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <small style={{ color: 'var(--danger)' }}>{errors.email.message}</small>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Sua senha"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <small style={{ color: 'var(--danger)' }}>{errors.password.message}</small>}
          </div>
          <Button type="submit" loading={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
            Entrar
          </Button>
        </form>

        <div className="login-footer">
          <Link to="/landing">Voltar ao site</Link>
        </div>
      </div>
    </div>
  )
}

