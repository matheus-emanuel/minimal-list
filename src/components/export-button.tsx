'use client'

import { Button } from '@/components/ui/button'

export type ExportRow = {
  title: string
  link: string
  session: string
  status: 'interested' | 'done'
  badgeImageUrl: string | null
  timestamp: string
}

export function ExportButton({ rows }: { rows: ExportRow[] }) {
  function handleExport() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'minimal-list-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      Exportar JSON
    </Button>
  )
}
