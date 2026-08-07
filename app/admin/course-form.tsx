'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCourse, updateCourse, deleteCourse } from '@/lib/actions/courses'

type Course = {
  id: string
  title: string
  url: string
  category: string
  tags: string[]
  description: string | null
}

function parseTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function CourseForm({ course, onDone }: { course?: Course; onDone?: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(course?.title ?? '')
  const [url, setUrl] = useState(course?.url ?? '')
  const [category, setCategory] = useState(course?.category ?? '')
  const [tags, setTags] = useState(course?.tags.join(', ') ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const payload = {
      title,
      url,
      category,
      tags: parseTags(tags),
      description: description || undefined,
    }

    startTransition(async () => {
      const result = course ? await updateCourse(course.id, payload) : await createCourse(payload)

      if (result.error) {
        setError('Não foi possível salvar o curso.')
        return
      }

      if (!course) {
        setTitle('')
        setUrl('')
        setCategory('')
        setTags('')
        setDescription('')
      }
      router.refresh()
      onDone?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border border-slate-200 bg-white p-4">
      <input
        required
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border p-2"
      />
      <input
        required
        type="url"
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded border p-2"
      />
      <input
        required
        placeholder="Categoria"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded border p-2"
      />
      <input
        placeholder="Tags (separadas por vírgula)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full rounded border p-2"
      />
      <textarea
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border p-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? 'Salvando...' : course ? 'Salvar alterações' : 'Adicionar curso'}
      </button>
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
    return <CourseForm course={course} onDone={() => setIsEditing(false)} />
  }

  return (
    <li className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
      <div>
        <p className="font-medium">{course.title}</p>
        <p className="text-xs text-slate-500">
          {course.category} · {course.tags.join(', ')}
        </p>
      </div>
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => setIsEditing(true)} className="text-blue-700">
          Editar
        </button>
        <button type="button" onClick={handleDelete} disabled={isPending} className="text-red-600">
          Remover
        </button>
      </div>
    </li>
  )
}
