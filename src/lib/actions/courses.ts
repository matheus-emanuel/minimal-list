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

  const { title, url, sessionId, tags, description, badgeImagePath } = parsed.data
  const { error } = await supabase.from('courses').insert({
    title,
    url,
    session_id: sessionId,
    tags,
    description,
    badge_image_path: badgeImagePath,
    created_by: user.id,
  })
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

  const { title, url, sessionId, tags, description, badgeImagePath } = parsed.data
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('courses')
    .update({
      ...(title !== undefined && { title }),
      ...(url !== undefined && { url }),
      ...(sessionId !== undefined && { session_id: sessionId }),
      ...(tags !== undefined && { tags }),
      ...(description !== undefined && { description }),
      ...(badgeImagePath !== undefined && { badge_image_path: badgeImagePath }),
    })
    .eq('id', courseId)
  if (error) {
    console.error('updateCourse failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/badges')
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

async function moveCourse(courseId: string, direction: 'up' | 'down') {
  const supabase = await createServerClient()

  const { data: current } = await supabase
    .from('courses')
    .select('id, session_id, sort_order')
    .eq('id', courseId)
    .single()
  if (!current) return { error: 'not_found' as const }

  const neighborQuery = supabase
    .from('courses')
    .select('id, sort_order')
    .eq('session_id', current.session_id)
    .limit(1)

  const { data: neighbor } =
    direction === 'up'
      ? await neighborQuery.lt('sort_order', current.sort_order).order('sort_order', { ascending: false }).maybeSingle()
      : await neighborQuery.gt('sort_order', current.sort_order).order('sort_order', { ascending: true }).maybeSingle()

  if (!neighbor) return { ok: true, error: undefined } // already at the edge

  const { error: error1 } = await supabase.from('courses').update({ sort_order: neighbor.sort_order }).eq('id', current.id)
  const { error: error2 } = await supabase.from('courses').update({ sort_order: current.sort_order }).eq('id', neighbor.id)
  if (error1 || error2) return toActionError(error1 ?? error2!)

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function moveCourseUp(courseId: string) {
  return moveCourse(courseId, 'up')
}

export async function moveCourseDown(courseId: string) {
  return moveCourse(courseId, 'down')
}
