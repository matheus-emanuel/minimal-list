'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { SessionSchema } from '@/lib/validation/schemas'

function toActionError(error: { code?: string; message: string }) {
  if (error.code === '42501') return { error: 'not_authorized' as const }
  if (error.code === '23505') return { error: 'session_name_taken' as const }
  if (error.code === '23503') return { error: 'session_has_courses' as const }
  return { error: error.message }
}

export async function createSession(input: unknown) {
  const parsed = SessionSchema.safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const { error } = await supabase.from('sessions').insert(parsed.data)
  if (error) {
    console.error('createSession failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function updateSession(sessionId: string, input: unknown) {
  const parsed = SessionSchema.partial().safeParse(input)
  if (!parsed.success) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()
  const { error } = await supabase.from('sessions').update(parsed.data).eq('id', sessionId)
  if (error) {
    console.error('updateSession failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function deleteSession(sessionId: string) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) {
    console.error('deleteSession failed', error)
    return toActionError(error)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function mergeSessionInto(sourceSessionId: string, targetSessionId: string) {
  if (sourceSessionId === targetSessionId) return { error: 'invalid_input' as const }

  const supabase = await createServerClient()

  const { error: moveError } = await supabase
    .from('courses')
    .update({ session_id: targetSessionId })
    .eq('session_id', sourceSessionId)
  if (moveError) {
    console.error('mergeSessionInto: moving courses failed', moveError)
    return toActionError(moveError)
  }

  const { error: deleteError } = await supabase.from('sessions').delete().eq('id', sourceSessionId)
  if (deleteError) {
    console.error('mergeSessionInto: deleting source session failed', deleteError)
    return toActionError(deleteError)
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

async function moveSession(sessionId: string, direction: 'up' | 'down') {
  const supabase = await createServerClient()

  const { data: current } = await supabase.from('sessions').select('id, sort_order').eq('id', sessionId).single()
  if (!current) return { error: 'not_found' as const }

  const neighborQuery = supabase.from('sessions').select('id, sort_order').limit(1)

  const { data: neighbor } =
    direction === 'up'
      ? await neighborQuery.lt('sort_order', current.sort_order).order('sort_order', { ascending: false }).maybeSingle()
      : await neighborQuery.gt('sort_order', current.sort_order).order('sort_order', { ascending: true }).maybeSingle()

  if (!neighbor) return { ok: true, error: undefined } // already at the edge

  const { error: error1 } = await supabase.from('sessions').update({ sort_order: neighbor.sort_order }).eq('id', current.id)
  const { error: error2 } = await supabase.from('sessions').update({ sort_order: current.sort_order }).eq('id', neighbor.id)
  if (error1 || error2) return toActionError(error1 ?? error2!)

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}

export async function moveSessionUp(sessionId: string) {
  return moveSession(sessionId, 'up')
}

export async function moveSessionDown(sessionId: string) {
  return moveSession(sessionId, 'down')
}
