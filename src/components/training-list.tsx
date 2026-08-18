'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CourseDragList } from '@/components/course-drag-list'
import { SessionForm, SessionHeader } from '@/components/session-form'
import { AddCourseButton } from '@/components/add-course-button'

type Session = { id: string; name: string }
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

export function TrainingList({
  sessions,
  courses,
  statusByCourse,
  isAuthenticated,
  isSysadmin,
}: {
  sessions: Session[]
  courses: Course[]
  statusByCourse: Record<string, 'interested' | 'done'>
  isAuthenticated: boolean
  isSysadmin: boolean
}) {
  const [query, setQuery] = useState('')

  const sessionNameById = useMemo(() => new Map(sessions.map((s) => [s.id, s.name])), [sessions])

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return courses
    return courses.filter((course) => {
      const sessionName = sessionNameById.get(course.session_id) ?? ''
      return (
        course.title.toLowerCase().includes(q) ||
        sessionName.toLowerCase().includes(q) ||
        course.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [courses, query, sessionNameById])

  const visibleSessionIds = useMemo(() => new Set(filteredCourses.map((c) => c.session_id)), [filteredCourses])

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        <span className="font-semibold text-strong tabular-nums">{courses.length}</span> treinamentos gratuitos que
        dão badge
      </p>
      <Input
        type="search"
        placeholder="Buscar por nome, tag ou provedor..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar treinamentos"
      />
      {isSysadmin && <SessionForm />}
      {sessions
        .filter((session) => !query.trim() || visibleSessionIds.has(session.id))
        .map((session) => (
          <Card key={session.id}>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              {isSysadmin ? (
                <SessionHeader session={session} otherSessions={sessions.filter((s) => s.id !== session.id)} />
              ) : (
                <CardTitle>{session.name}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <CourseDragList
                sessionId={session.id}
                courses={filteredCourses.filter((course) => course.session_id === session.id)}
                statusByCourse={statusByCourse}
                isAuthenticated={isAuthenticated}
                isSysadmin={isSysadmin}
                canReorder={isSysadmin && !query.trim()}
              />
              {isSysadmin && !query.trim() && <AddCourseButton sessionId={session.id} />}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
