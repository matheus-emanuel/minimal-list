'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const EMAIL_STORAGE_KEY = 'ml:last-email'
const PASSWORD_STORAGE_KEY = 'ml:last-password'
const REMEMBER_PASSWORD_KEY = 'ml:remember-password'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberPassword, setRememberPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY)
    if (savedEmail) setEmail(savedEmail)
    const remember = window.localStorage.getItem(REMEMBER_PASSWORD_KEY) === '1'
    setRememberPassword(remember)
    if (remember) {
      const savedPassword = window.localStorage.getItem(PASSWORD_STORAGE_KEY)
      if (savedPassword) setPassword(savedPassword)
    }
  }, [])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(
          signInError.status === 400
            ? 'Email ou senha inválidos.'
            : `Não foi possível entrar (${signInError.message}). Verifique sua conexão e tente novamente.`
        )
        return
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email)
        if (rememberPassword) {
          window.localStorage.setItem(PASSWORD_STORAGE_KEY, password)
          window.localStorage.setItem(REMEMBER_PASSWORD_KEY, '1')
        } else {
          window.localStorage.removeItem(PASSWORD_STORAGE_KEY)
          window.localStorage.removeItem(REMEMBER_PASSWORD_KEY)
        }
        // Hard reload so the server-rendered layout sees the freshly-set
        // session cookie — a soft navigation can race the cookie write.
        window.location.assign('/')
      } else {
        router.push('/')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Link href="/esqueci-senha" className="block text-right text-xs text-muted underline-offset-4 hover:text-strong hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-strong"
          />
          <span>Mostrar senha</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={rememberPassword}
            onChange={(e) => setRememberPassword(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-strong"
          />
          <span>Lembrar minha senha neste dispositivo</span>
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
