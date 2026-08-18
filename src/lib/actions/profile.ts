'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { ProfileSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '23505') return { error: 'username_taken' as const } // AT-008
  if (error.code === '42501') return { error: 'not_authorized' as const }
  return { error: error.message }
}

export async function updateProfile(input: unknown) {
  const parsed = ProfileSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  const { displayName, avatarUrl, username } = parsed.data
  const row = {
    ...(displayName !== undefined && { display_name: displayName }),
    ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
    ...(username !== undefined && { username }),
  }

  const { error } = await supabase.from('profiles').update(row).eq('id', user.id)
  if (error) {
    console.error('updateProfile failed', error)
    return toActionError(error)
  }

  revalidatePath('/perfil')
  if (username !== undefined) revalidatePath(`/u/${username}`)
  return { ok: true, error: undefined }
}
