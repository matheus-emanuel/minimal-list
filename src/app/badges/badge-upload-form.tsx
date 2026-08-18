'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBadgePost } from '@/lib/actions/badges'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function BadgeUploadForm({ courses }: { courses: { id: string; title: string }[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [courseId, setCourseId] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Selecione uma foto.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('A foto precisa ter até 5MB.')
      return
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Formato não suportado. Use JPEG, PNG ou WebP.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Sua sessão expirou. Faça login novamente.')
        return
      }

      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('badges')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setError('Falha no upload. Tente novamente.')
        return
      }

      const result = await createBadgePost({
        courseId: courseId || null,
        imagePath: filePath,
        caption: caption || undefined,
      })

      if (result.error === 'upload_rate_limit_exceeded') {
        setError('Você atingiu o limite de 10 badges por dia.')
        return
      }
      if (result.error) {
        setError('Não foi possível publicar o badge.')
        return
      }

      setCaption('')
      setCourseId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-sm font-medium">Foto do badge (até 5MB, JPEG/PNG/WebP)</label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <div>
        <label className="block text-sm font-medium">Curso (opcional)</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="">Nenhum</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Legenda (opcional)</label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={280}
          className="w-full rounded border p-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? 'Publicando...' : 'Publicar badge'}
      </button>
    </form>
  )
}
