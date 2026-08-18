'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCourse, updateCourse, deleteCourse, moveCourseUp, moveCourseDown } from '@/lib/actions/courses'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BadgeImage } from '@/components/badge-image'
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

function parseTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function CourseForm({
  sessionId,
  course,
  onDone,
}: {
  sessionId: string
  course?: Course
  onDone?: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(course?.title ?? '')
  const [url, setUrl] = useState(course?.url ?? '')
  const [tags, setTags] = useState(course?.tags.join(', ') ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [badgeImagePath, setBadgeImagePath] = useState(course?.badge_image_path ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      let newBadgePath = badgeImagePath

      const file = fileInputRef.current?.files?.[0]
      if (file) {
        const ext = file.name.split('.').pop() ?? 'png'
        const filePath = `${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('course-badges').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (uploadError) {
          setError('Falha no upload do badge.')
          return
        }
        newBadgePath = filePath
      }

      const payload = {
        title,
        url,
        sessionId,
        tags: parseTags(tags),
        description: description || undefined,
        badgeImagePath: newBadgePath,
      }

      const result = course ? await updateCourse(course.id, payload) : await createCourse(payload)
      if (result.error) {
        setError('Não foi possível salvar o treinamento.')
        return
      }

      if (!course) {
        setTitle('')
        setUrl('')
        setTags('')
        setDescription('')
        setBadgeImagePath(null)
      }
      router.refresh()
      onDone?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-subtle p-4">
      <div className="flex items-center gap-3">
        <BadgeImage
          src={badgeImagePath ? supabase.storage.from('course-badges').getPublicUrl(badgeImagePath).data.publicUrl : null}
          alt=""
        />
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="text-xs text-muted" />
      </div>
      <Input required placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input required type="url" placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Input placeholder="Tags (separadas por vírgula)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-border bg-canvas p-2 text-sm text-strong placeholder:text-muted"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? 'Salvando...' : course ? 'Salvar alterações' : 'Adicionar treinamento'}
      </Button>
    </form>
  )
}

export function CourseListItem({ course }: { course: Course }) {
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
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas p-3">
      <div className="flex min-w-0 items-center gap-3">
        <ReorderArrows id={course.id} onMoveUp={moveCourseUp} onMoveDown={moveCourseDown} />
        <div className="min-w-0">
          <p className="truncate font-medium text-strong">{course.title}</p>
          <p className="truncate text-xs text-muted">{course.tags.join(', ')}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-3 text-sm">
        <button type="button" onClick={() => setIsEditing(true)} className="text-strong underline-offset-2 hover:underline">
          Editar
        </button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="text-danger">
          Remover
        </button>
      </div>
    </li>
  )
}
