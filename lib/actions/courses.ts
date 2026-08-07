'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { CourseSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '42501') return { error: 'not_authorized' as const }
  return { error: error.message }
}

export async function createCourse(input: unknown) {
  const parsed = CourseSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  const { error } = await supabase.from('courses').insert({ ...parsed.data, created_by: user.id })
  if (error) {
    console.error('createCourse failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function updateCourse(courseId: string, input: unknown) {
  const parsed = CourseSchema.partial().safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const { error } = await supabase.from('courses').update(parsed.data).eq('id', courseId)
  if (error) {
    console.error('updateCourse failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function deleteCourse(courseId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) {
    console.error('deleteCourse failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}
