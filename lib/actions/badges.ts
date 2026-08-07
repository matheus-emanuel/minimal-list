'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { CreateBadgePostSchema, ReportPostSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '42501') return { error: 'not_authorized' as const }
  if (error.message?.includes('upload_rate_limit_exceeded')) {
    return { error: 'upload_rate_limit_exceeded' as const }
  }
  return { error: error.message }
}

export async function createBadgePost(input: unknown) {
  const parsed = CreateBadgePostSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  // Fast-feedback pre-check (Decision 3) — the DB trigger is the real guarantee.
  const { count } = await supabase
    .from('badge_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((count ?? 0) >= 10) {
    return { error: 'upload_rate_limit_exceeded' as const }
  }

  const { error } = await supabase.from('badge_posts').insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    image_path: parsed.data.imagePath,
    caption: parsed.data.caption,
  })
  if (error) {
    console.error('createBadgePost failed', error)
    return toActionError(error)
  }

  revalidatePath('/badges')
  return { ok: true, error: undefined }
}

export async function deleteBadgePost(postId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('badge_posts').delete().eq('id', postId)
  if (error) {
    console.error('deleteBadgePost failed', error)
    return toActionError(error)
  }

  revalidatePath('/badges')
  revalidatePath('/admin/reports')
  return { ok: true, error: undefined }
}

export async function toggleReaction(postId: string, liked: boolean) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  if (liked) {
    const { error } = await supabase
      .from('badge_reactions')
      .upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id' })
    if (error) {
      console.error('toggleReaction insert failed', error)
      return toActionError(error)
    }
  } else {
    const { error } = await supabase
      .from('badge_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) {
      console.error('toggleReaction delete failed', error)
      return toActionError(error)
    }
  }

  revalidatePath('/badges')
  return { ok: true, error: undefined }
}

export async function reportPost(input: unknown) {
  const parsed = ReportPostSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  const { error } = await supabase.from('badge_reports').insert({
    post_id: parsed.data.postId,
    reported_by: user.id,
    reason: parsed.data.reason,
  })
  if (error) {
    console.error('reportPost failed', error)
    return toActionError(error)
  }

  return { ok: true, error: undefined }
}
