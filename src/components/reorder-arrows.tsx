'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

type MoveAction = (id: string) => Promise<{ ok?: boolean; error?: string }>

export function ReorderArrows({ id, onMoveUp, onMoveDown }: { id: string; onMoveUp: MoveAction; onMoveDown: MoveAction }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function move(action: MoveAction) {
    startTransition(async () => {
      await action(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => move(onMoveUp)}
        disabled={isPending}
        aria-label="Mover para cima"
        className="flex h-5 w-5 items-center justify-center rounded text-muted hover:text-strong disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => move(onMoveDown)}
        disabled={isPending}
        aria-label="Mover para baixo"
        className="flex h-5 w-5 items-center justify-center rounded text-muted hover:text-strong disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  )
}
