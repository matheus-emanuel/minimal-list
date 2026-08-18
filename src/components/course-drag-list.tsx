'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reorderCourses } from '@/lib/actions/courses'
import { CourseRow } from '@/components/course-row'
import { cn } from '@/lib/utils'

type Course = {
  id: string
  title: string
  url: string
  session_id: string
  tags: string[]
  description: string | null
  badge_image_path: string | null
  badgeUrl: string | null
}

function RankBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center self-center rounded-full bg-canvas px-1.5 text-xs font-medium tabular-nums text-muted">
      #{n}
    </span>
  )
}

export function CourseDragList({
  sessionId,
  courses,
  startIndex,
  statusByCourse,
  isAuthenticated,
  isSysadmin,
  canReorder,
}: {
  sessionId: string
  courses: Course[]
  startIndex: number
  statusByCourse: Record<string, 'interested' | 'done'>
  isAuthenticated: boolean
  isSysadmin: boolean
  canReorder: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(courses)
  const dragIndexRef = useRef<number | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => setItems(courses), [courses])

  function handleDrop() {
    if (dragIndexRef.current === null) return
    dragIndexRef.current = null
    startTransition(async () => {
      await reorderCourses(
        sessionId,
        items.map((c) => c.id)
      )
      router.refresh()
    })
  }

  return (
    <>
      {items.map((course, index) => (
        <div
          key={course.id}
          draggable={canReorder}
          onDragStart={canReorder ? () => (dragIndexRef.current = index) : undefined}
          onDragOver={
            canReorder
              ? (event) => {
                  event.preventDefault()
                  const from = dragIndexRef.current
                  if (from === null || from === index) return
                  setItems((prev) => {
                    const next = [...prev]
                    const [moved] = next.splice(from, 1)
                    next.splice(index, 0, moved)
                    return next
                  })
                  dragIndexRef.current = index
                }
              : undefined
          }
          onDrop={canReorder ? handleDrop : undefined}
          onDragEnd={canReorder ? handleDrop : undefined}
          className={cn('flex items-center gap-2', canReorder && 'cursor-grab active:cursor-grabbing')}
        >
          <RankBadge n={startIndex + index + 1} />
          <div className="min-w-0 flex-1">
            <CourseRow
              course={course}
              badgeUrl={course.badgeUrl}
              initialStatus={statusByCourse[course.id] ?? 'neutral'}
              isAuthenticated={isAuthenticated}
              isSysadmin={isSysadmin}
            />
          </div>
        </div>
      ))}
    </>
  )
}
