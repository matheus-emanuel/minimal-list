'use client'

import { useState, useTransition } from 'react'
import { toggleCompletion } from '@/lib/actions/completions'

type Course = {
  id: string
  title: string
  url: string
  category: string
  tags: string[]
}

export function CourseList({
  courses,
  completedCourseIds,
  isAuthenticated,
}: {
  courses: Course[]
  completedCourseIds: string[]
  isAuthenticated: boolean
}) {
  const [completed, setCompleted] = useState(() => new Set(completedCourseIds))
  const [isPending, startTransition] = useTransition()

  const categories = Array.from(new Set(courses.map((c) => c.category)))

  function handleToggle(courseId: string) {
    if (!isAuthenticated) return
    const wasCompleted = completed.has(courseId)

    setCompleted((prev) => {
      const next = new Set(prev)
      if (wasCompleted) next.delete(courseId)
      else next.add(courseId)
      return next
    })

    startTransition(async () => {
      const result = await toggleCompletion({ courseId, completed: !wasCompleted })
      if (result.error) {
        setCompleted((prev) => {
          const rollback = new Set(prev)
          if (wasCompleted) rollback.add(courseId)
          else rollback.delete(courseId)
          return rollback
        })
      }
    })
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <section key={category}>
          <h2 className="mb-2 text-lg font-semibold">{category}</h2>
          <ul className="space-y-1">
            {courses
              .filter((course) => course.category === category)
              .map((course) => (
                <li key={course.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={completed.has(course.id)}
                    disabled={!isAuthenticated || isPending}
                    onChange={() => handleToggle(course.id)}
                    aria-label={`Marcar ${course.title} como concluído`}
                  />
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    {course.title}
                  </a>
                  {course.tags.length > 0 && (
                    <span className="text-xs text-slate-500">{course.tags.join(', ')}</span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
