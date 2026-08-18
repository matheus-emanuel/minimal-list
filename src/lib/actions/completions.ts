'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { ToggleCompletionSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '42501') return { error: 'not_authorized' as const }
  return { error: error.message }
}

export async function toggleCompletion(input: unknown) {
  const parsed = ToggleCompletionSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }
  const { courseId, completed } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  if (completed) {
    const { error } = await supabase
      .from('completions')
      .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })
    if (error) {
      console.error('toggleCompletion upsert failed', error)
      return toActionError(error)
    }
  } else {
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId)
    if (error) {
      console.error('toggleCompletion delete failed', error)
      return toActionError(error)
    }
  }

  revalidatePath('/')
  return { ok: true, error: undefined }
}
