'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) {
        setError('Não foi possível criar a conta. Tente novamente.')
        return
      }
      setMessage('Conta criada! Confira seu email para confirmar.')
    })
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold">Criar conta</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Nome de exibição (opcional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border p-2"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Senha (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border p-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? 'Criando...' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
