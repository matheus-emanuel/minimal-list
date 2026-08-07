import { createServerClient } from '@/lib/supabase/server'
import { CourseForm, CourseListItem } from './course-form'

export default async function AdminCoursesPage() {
  const supabase = await createServerClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, url, category, tags, description')
    .order('category')
    .order('title')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gerenciar Cursos</h1>
      <CourseForm />
      <ul className="space-y-2">
        {(courses ?? []).map((course) => (
          <CourseListItem key={course.id} course={course} />
        ))}
      </ul>
    </div>
  )
}
