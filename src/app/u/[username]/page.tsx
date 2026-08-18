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

  const { data: done } = await supabase
    .from('completions')
    .select('course_id, completed_at, courses(title, url, badge_image_path, sessions(badge_image_path))')
    .eq('user_id', profile.id)
    .eq('status', 'done')
    .order('completed_at', { ascending: false })

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
        {(done ?? []).length === 0 && <p className="text-sm text-muted">Nenhum treinamento concluído ainda.</p>}
        <ul className="space-y-1">
          {(done ?? []).map((entry) => {
            const course = entry.courses
            if (!course) return null
            return (
              <li key={entry.course_id} className="flex items-center gap-3 rounded-md border border-border bg-subtle p-3">
                <BadgeImage
                  src={(() => {
                    const path = course.badge_image_path ?? course.sessions?.badge_image_path ?? null
                    return path ? supabase.storage.from('course-badges').getPublicUrl(path).data.publicUrl : null
                  })()}
                  alt={course.title}
                />
                <a href={course.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-strong hover:underline">
                  {course.title}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
