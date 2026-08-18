'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CourseForm } from '@/app/admin/course-form'

export function AddCourseButton({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + Adicionar treinamento
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <CourseForm sessionId={sessionId} onDone={() => setIsOpen(false)} />
      <button type="button" onClick={() => setIsOpen(false)} className="text-sm text-muted hover:text-strong">
        Cancelar
      </button>
    </div>
  )
}
