'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={copied ? 'Link copiado' : 'Copiar link do treinamento'}
      title={copied ? 'Copiado!' : 'Copiar link'}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
        copied ? 'border-green-600 bg-green-600 text-white' : 'border-border bg-canvas text-muted hover:text-strong'
      )}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
    </button>
  )
}
