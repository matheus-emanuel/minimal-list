'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      // Recovery links carry a PKCE `?code=`, which only /auth/callback can
      // exchange for a session — landing directly on /redefinir-senha would
      // have no session to call updateUser() against.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      })
      if (resetError) {
        setError('Não foi possível enviar o link. Tente novamente.')
        return
      }
      setSent(true)
    })
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-strong">Esqueci minha senha</h1>
        <p className="text-sm text-muted">Enviamos um link para você definir uma nova senha.</p>
      </div>
      {sent ? (
        <p className="rounded-lg border border-border bg-subtle p-4 text-sm text-body">
          Se <strong className="text-strong">{email}</strong> tiver uma conta, um link de recuperação foi enviado.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
        </form>
      )}
    </div>
  )
}
