import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { BadgeImage } from '@/components/badge-image'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, username')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  // Public visitors have no RLS access to other users' `completions` rows —
  // `mural_entries` is the view built for exactly this (owner-privilege
  // public projection, see migration 0012), same source the Mural feed uses.
  const { data: entries } = await supabase
    .from('mural_entries')
    .select('course_id, storage_bucket, image_path, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const courseIds = [...new Set((entries ?? []).map((e) => e.course_id).filter((id): id is string => !!id))]
  const { data: courses } = courseIds.length
    ? await supabase.from('courses').select('id, title, url').in('id', courseIds)
    : { data: [] as { id: string; title: string; url: string }[] }
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]))

  const done = (entries ?? []).flatMap((entry) => {
    const course = entry.course_id ? courseById.get(entry.course_id) : null
    if (!course) return []
    return [{ ...entry, course }]
  })

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <BadgeImage src={profile.avatar_url} alt={profile.display_name} size={64} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-strong">{profile.display_name}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted">Treinamentos concluídos</h2>
        {done.length === 0 && <p className="text-sm text-muted">Nenhum treinamento concluído ainda.</p>}
        <ul className="space-y-1">
          {done.map(({ course, storage_bucket, image_path }) => (
            <li key={course.id} className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
              <BadgeImage
                src={image_path && storage_bucket ? supabase.storage.from(storage_bucket).getPublicUrl(image_path).data.publicUrl : null}
                alt={course.title}
              />
              <a href={course.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-strong hover:underline">
                {course.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
