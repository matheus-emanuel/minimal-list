'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCourse, moveCourseUp, moveCourseDown } from '@/lib/actions/courses'
import { CourseForm } from '@/app/admin/course-form'
import { BadgeImage } from '@/components/badge-image'
import { InterestButton } from '@/components/interest-button'
import { CopyLinkButton } from '@/components/copy-link-button'
import { ReorderArrows } from '@/components/reorder-arrows'

type Course = {
  id: string
  title: string
  url: string
  session_id: string
  tags: string[]
  description: string | null
  badge_image_path: string | null
}

export function CourseRow({
  course,
  badgeUrl,
  initialStatus,
  isAuthenticated,
  isSysadmin,
}: {
  course: Course
  badgeUrl: string | null
  initialStatus: 'neutral' | 'interested' | 'done'
  isAuthenticated: boolean
  isSysadmin: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm(`Remover "${course.title}"?`)) return
    startTransition(async () => {
      await deleteCourse(course.id)
      router.refresh()
    })
  }

  if (isEditing) {
    return <CourseForm sessionId={course.session_id} course={course} onDone={() => setIsEditing(false)} />
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-canvas">
      {isSysadmin && <ReorderArrows id={course.id} onMoveUp={moveCourseUp} onMoveDown={moveCourseDown} />}
      <BadgeImage src={badgeUrl} alt={course.title} />
      <div className="min-w-0 flex-1">
        <a href={course.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-strong underline-offset-2 hover:underline">
          {course.title}
        </a>
        {course.tags.length > 0 && <p className="text-xs text-muted">{course.tags.join(', ')}</p>}
      </div>
      {isSysadmin && (
        <div className="flex shrink-0 gap-3 text-sm">
          <button type="button" onClick={() => setIsEditing(true)} className="text-muted hover:text-strong">
            Editar
          </button>
          <button type="button" onClick={handleDelete} disabled={isPending} className="text-danger">
            Remover
          </button>
        </div>
      )}
      <CopyLinkButton url={course.url} />
      <InterestButton courseId={course.id} initialStatus={initialStatus} isAuthenticated={isAuthenticated} />
    </div>
  )
}
