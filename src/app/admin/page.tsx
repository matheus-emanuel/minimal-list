import { createServerClient } from '@/lib/supabase/server'
import { SessionForm, SessionHeader } from '@/components/session-form'
import { CourseForm, CourseListItem } from './course-form'

export default async function AdminSessionsPage() {
  const supabase = await createServerClient()
  const { data: sessions } = await supabase.from('sessions').select('id, name').order('sort_order').order('name')

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, url, session_id, tags, description, badge_image_path')
    .order('sort_order')
    .order('title')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-strong">Gerenciar sessões e treinamentos</h1>
      <SessionForm />
      <div className="space-y-8">
        {(sessions ?? []).map((session) => (
          <section key={session.id} className="space-y-3 rounded-lg border border-border bg-subtle p-4">
            <SessionHeader session={session} otherSessions={(sessions ?? []).filter((s) => s.id !== session.id)} />
            <CourseForm sessionId={session.id} />
            <ul className="space-y-2">
              {(courses ?? [])
                .filter((course) => course.session_id === session.id)
                .map((course) => (
                  <CourseListItem key={course.id} course={course} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
