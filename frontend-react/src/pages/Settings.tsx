import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { apiRequest } from '../lib/api/client'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/ui/ErrorMessage'

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme a nova senha'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
type PwForm = z.infer<typeof pwSchema>

export function Settings() {
  useDocumentTitle('Configurações')
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema)
  })

  const onChangePw = async (data: PwForm) => {
    setPwError(null)
    setPwSuccess(false)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      })
      setPwSuccess(true)
      reset()
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Falha ao trocar senha')
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>🔧 Configurações</h1>
          <p className="subtitle">Preferências da conta e sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Aparência" />
        <CardBody>
          <div className="settings-section">
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Tema</div>
                <div className="setting-desc">Escolha entre tema claro ou escuro</div>
              </div>
              <div className="theme-toggle-pills">
                <button
                  type="button"
                  className={`theme-pill${theme === 'light' ? ' active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  ☀️ Claro
                </button>
                <button
                  type="button"
                  className={`theme-pill${theme === 'dark' ? ' active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  🌙 Escuro
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Conta" />
        <CardBody>
          <div className="settings-section">
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Nome</div>
                <div className="setting-desc">{user?.name}</div>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">E-mail</div>
                <div className="setting-desc">{user?.email}</div>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Perfil</div>
                <div className="setting-desc">{user?.role}</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Trocar Senha" />
        <CardBody>
          {pwSuccess && (
            <div className="alert-success" style={{ padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1rem', background: '#d4edda', color: '#155724' }}>
              Senha alterada com sucesso!
            </div>
          )}
          {pwError && <ErrorMessage message={pwError} onDismiss={() => setPwError(null)} />}
          <form onSubmit={handleSubmit(onChangePw)} noValidate style={{ maxWidth: '480px' }}>
            <div className="form-group">
              <label>Senha Atual</label>
              <input type="password" className="form-control" {...register('currentPassword')} />
              {errors.currentPassword && <small style={{ color: 'var(--danger)' }}>{errors.currentPassword.message}</small>}
            </div>
            <div className="form-group">
              <label>Nova Senha</label>
              <input type="password" className="form-control" {...register('newPassword')} />
              {errors.newPassword && <small style={{ color: 'var(--danger)' }}>{errors.newPassword.message}</small>}
            </div>
            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <input type="password" className="form-control" {...register('confirmPassword')} />
              {errors.confirmPassword && <small style={{ color: 'var(--danger)' }}>{errors.confirmPassword.message}</small>}
            </div>
            <Button type="submit" loading={isSubmitting}>Trocar Senha</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

