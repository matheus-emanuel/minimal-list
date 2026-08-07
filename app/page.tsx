import { createServerClient } from '@/lib/supabase/server'
import { CourseList } from './course-list'

export default async function HomePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, url, category, tags')
    .order('category')
    .order('title')

  const { data: completions } = user
    ? await supabase.from('completions').select('course_id').eq('user_id', user.id)
    : { data: [] as { course_id: string }[] }

  const completedCourseIds = (completions ?? []).map((c) => c.course_id)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Roadmap de Certificações Gratuitas</h1>
      {!user && (
        <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
          Entre na sua conta para marcar cursos como concluídos.
        </p>
      )}
      <CourseList
        courses={courses ?? []}
        completedCourseIds={completedCourseIds}
        isAuthenticated={!!user}
      />
    </div>
  )
}
