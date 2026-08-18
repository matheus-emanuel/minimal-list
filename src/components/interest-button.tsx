'use client'

import { useState, useTransition } from 'react'
import { setCompletionStatus } from '@/lib/actions/completions'
import { cn } from '@/lib/utils'

type Status = 'neutral' | 'interested' | 'done'
const NEXT: Record<Status, Status> = { neutral: 'interested', interested: 'done', done: 'neutral' }
const LABEL: Record<Status, string> = { neutral: 'Marcar interesse', interested: 'Tenho interesse', done: 'Concluído' }

export function InterestButton({
  courseId,
  initialStatus,
  isAuthenticated,
}: {
  courseId: string
  initialStatus: Status
  isAuthenticated: boolean
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!isAuthenticated) return
    const previous = status
    const next = NEXT[status]
    setStatus(next)

    startTransition(async () => {
      const result = await setCompletionStatus({ courseId, status: next === 'neutral' ? null : next })
      if (result.error) setStatus(previous)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAuthenticated || isPending}
      aria-label={LABEL[status]}
      title={LABEL[status]}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        status === 'neutral' && 'border-border bg-canvas text-muted hover:text-strong',
        status === 'interested' && 'border-yellow-500 bg-yellow-500 text-black',
        status === 'done' && 'border-green-600 bg-green-600 text-white'
      )}
    >
      {status === 'done' ? (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={16} height={16} fill={status === 'interested' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      )}
    </button>
  )
}
