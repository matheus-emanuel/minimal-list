import { createServerClient } from '@/lib/supabase/server'
import { TrainingList } from '@/components/training-list'
import { ExportButton, type ExportRow } from '@/components/export-button'

export default async function HomePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user ? (await supabase.from('profiles').select('role').eq('id', user.id).single()).data : null
  const isSysadmin = profile?.role === 'sysadmin'

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, badge_image_path')
    .order('sort_order')
    .order('name')

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, url, session_id, tags, description, badge_image_path')
    .order('sort_order')
    .order('title')

  const { data: completions } = user
    ? await supabase.from('completions').select('course_id, status, completed_at').eq('user_id', user.id)
    : { data: [] as { course_id: string; status: string; completed_at: string }[] }

  const statusByCourse: Record<string, 'interested' | 'done'> = Object.fromEntries(
    (completions ?? []).map((c) => [c.course_id, c.status as 'interested' | 'done'])
  )

  const sessionBadgeById = new Map((sessions ?? []).map((s) => [s.id, s.badge_image_path]))
  const coursesWithBadge = (courses ?? []).map((course) => {
    const path = course.badge_image_path ?? sessionBadgeById.get(course.session_id) ?? null
    return {
      ...course,
      badgeUrl: path ? supabase.storage.from('course-badges').getPublicUrl(path).data.publicUrl : null,
    }
  })

  const sessionNameById = new Map((sessions ?? []).map((s) => [s.id, s.name]))
  const exportRows: ExportRow[] = (completions ?? []).flatMap((completion) => {
    const course = coursesWithBadge.find((c) => c.id === completion.course_id)
    if (!course) return []
    return [
      {
        title: course.title,
        link: course.url,
        session: sessionNameById.get(course.session_id) ?? '',
        status: completion.status as 'interested' | 'done',
        badgeImageUrl: course.badgeUrl,
        timestamp: completion.completed_at,
      },
    ]
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-strong">Treinamentos gratuitos que dão badge</h1>
          <p className="mt-1 text-sm text-muted">Cursos oficiais de provedores como Databricks, Oracle Cloud e outros.</p>
        </div>
        {user && <ExportButton rows={exportRows} />}
      </div>
      {!user && (
        <p className="rounded-lg border border-border bg-subtle p-4 text-sm text-muted">
          <a href="/login" className="text-strong underline underline-offset-2">
            Entre na sua conta
          </a>{' '}
          ou{' '}
          <a href="/signup" className="text-strong underline underline-offset-2">
            crie uma conta gratuita
          </a>{' '}
          para marcar treinamentos como interesse ou concluído.
        </p>
      )}
      <TrainingList
        sessions={sessions ?? []}
        courses={coursesWithBadge}
        statusByCourse={statusByCourse}
        isAuthenticated={!!user}
        isSysadmin={isSysadmin}
      />
    </div>
  )
}
