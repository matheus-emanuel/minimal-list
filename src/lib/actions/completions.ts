'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { SetCompletionStatusSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '42501') return { error: 'not_authorized' as const }
  return { error: error.message }
}

export async function setCompletionStatus(input: unknown) {
  const parsed = SetCompletionStatusSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }
  const { courseId, status } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  if (status === null) {
    const { error } = await supabase.from('completions').delete().eq('user_id', user.id).eq('course_id', courseId)
    if (error) {
      console.error('setCompletionStatus delete failed', error)
      return toActionError(error)
    }
  } else {
    const { error } = await supabase.from('completions').upsert(
      { user_id: user.id, course_id: courseId, status, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,course_id' }
    )
    if (error) {
      console.error('setCompletionStatus upsert failed', error)
      return toActionError(error)
    }
  }

  revalidatePath('/')
  revalidatePath('/badges')
  return { ok: true, error: undefined }
}
