'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createSession,
  updateSession,
  deleteSession,
  mergeSessionInto,
  moveSessionUp,
  moveSessionDown,
} from '@/lib/actions/sessions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReorderArrows } from '@/components/reorder-arrows'

export function SessionForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createSession({ name })
      if (result.error === 'session_name_taken') {
        setError('Já existe uma sessão com esse nome.')
        return
      }
      if (result.error) {
        setError('Não foi possível criar a sessão.')
        return
      }
      setName('')
      router.refresh()
      onDone?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 rounded-lg border border-border bg-subtle p-4">
      <Input required placeholder="Nome da nova sessão" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Criando...' : 'Nova sessão'}
      </Button>
    </form>
  )
}

export function SessionHeader({
  session,
  otherSessions,
}: {
  session: { id: string; name: string }
  otherSessions: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [name, setName] = useState(session.name)
  const [mergeTargetId, setMergeTargetId] = useState(otherSessions[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRename(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      await updateSession(session.id, { name })
      router.refresh()
      setIsEditing(false)
    })
  }

  function handleDelete() {
    if (!window.confirm(`Remover a sessão "${session.name}"?`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteSession(session.id)
      if (result.error === 'session_has_courses') {
        setError('Essa sessão tem treinamentos dentro. Mescle com outra sessão ou remova os treinamentos primeiro.')
        return
      }
      router.refresh()
    })
  }

  function handleMerge(event: React.FormEvent) {
    event.preventDefault()
    if (!mergeTargetId) return
    const target = otherSessions.find((s) => s.id === mergeTargetId)
    if (!window.confirm(`Mover todos os treinamentos de "${session.name}" para "${target?.name}" e remover "${session.name}"?`)) return

    setError(null)
    startTransition(async () => {
      const result = await mergeSessionInto(session.id, mergeTargetId)
      if (result.error) {
        setError('Não foi possível mesclar as sessões.')
        return
      }
      router.refresh()
      setIsMerging(false)
    })
  }

  if (isEditing) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-64" />
        <Button type="submit" size="sm" disabled={isPending}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
          Cancelar
        </Button>
      </form>
    )
  }

  if (isMerging) {
    return (
      <form onSubmit={handleMerge} className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Mesclar &quot;{session.name}&quot; em:</span>
        <select
          value={mergeTargetId}
          onChange={(e) => setMergeTargetId(e.target.value)}
          className="h-8 rounded-md border border-border bg-canvas px-2 text-sm text-strong"
        >
          {otherSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={isPending || !mergeTargetId}>
          Mesclar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsMerging(false)}>
          Cancelar
        </Button>
        {error && <p className="w-full text-sm text-danger">{error}</p>}
      </form>
    )
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <ReorderArrows id={session.id} onMoveUp={moveSessionUp} onMoveDown={moveSessionDown} />
      <h2 className="flex-1 text-lg font-semibold text-strong">{session.name}</h2>
      <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-muted hover:text-strong">
        Renomear
      </button>
      {otherSessions.length > 0 && (
        <button type="button" onClick={() => setIsMerging(true)} className="text-sm text-muted hover:text-strong">
          Mesclar
        </button>
      )}
      <button type="button" onClick={handleDelete} disabled={isPending} className="text-sm text-danger">
        Remover
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  )
}
