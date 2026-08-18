'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fallback for links that deliver an implicit-flow session (tokens in the
  // URL hash) instead of a PKCE `?code=` — e.g. links generated via the
  // Admin API, which our PKCE-only /auth/callback route can't consume.
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const supabase = createClient()
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
          if (sessionError) {
            setError('Não foi possível confirmar o login. Peça um novo link.')
          } else {
            router.push('/')
            router.refresh()
          }
        })
        return
      }
    }

    if (new URLSearchParams(window.location.search).get('error') === 'auth_callback_failed') {
      setError('Não foi possível confirmar o login. Peça um novo link.')
    }
  }, [router])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const supabase = createClient()

      if (mode === 'password') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError('Email ou senha inválidos.')
          return
        }
        router.push('/')
        router.refresh()
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (otpError) {
          setError('Não foi possível enviar o link. Tente novamente.')
          return
        }
        setMessage('Link enviado! Confira seu email.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold">Entrar</h1>
      <div className="mb-4 flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={mode === 'password' ? 'font-semibold' : 'text-slate-500'}
        >
          Email e senha
        </button>
        <button
          type="button"
          onClick={() => setMode('magic-link')}
          className={mode === 'magic-link' ? 'font-semibold' : 'text-slate-500'}
        >
          Link mágico
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
        />
        {mode === 'password' && (
          <input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border p-2"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? 'Enviando...' : mode === 'password' ? 'Entrar' : 'Enviar link mágico'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Não tem conta?{' '}
        <a href="/signup" className="text-blue-700 hover:underline">
          Cadastre-se
        </a>
      </p>
    </div>
  )
}
