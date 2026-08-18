import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { anonClient, createTestUser, clientForUser, cleanupUser, serviceClient } from './helpers'

describe('mural_entries view', () => {
  let userA: { id: string; email: string }
  let userB: { id: string; email: string }
  let sessionId: string
  let courseWithBadgeId: string
  let courseNoPostId: string

  beforeAll(async () => {
    userA = await createTestUser('mural-a')
    userB = await createTestUser('mural-b')

    const { data: session } = await serviceClient.from('sessions').insert({ name: 'Mural Test Session' }).select().single()
    sessionId = session!.id

    const { data: course } = await serviceClient
      .from('courses')
      .insert({
        title: 'Mural Test Course',
        url: 'https://example.com',
        session_id: sessionId,
        badge_image_path: 'mural-test-badge.png',
      })
      .select()
      .single()
    courseWithBadgeId = course!.id

    const { data: courseNoPost } = await serviceClient
      .from('courses')
      .insert({
        title: 'Mural Test Course (manual post exists)',
        url: 'https://example.com',
        session_id: sessionId,
        badge_image_path: 'mural-test-badge-2.png',
      })
      .select()
      .single()
    courseNoPostId = courseNoPost!.id
  })

  afterAll(async () => {
    await serviceClient.from('courses').delete().in('id', [courseWithBadgeId, courseNoPostId])
    await serviceClient.from('sessions').delete().eq('id', sessionId)
    await cleanupUser(userA.id)
    await cleanupUser(userB.id)
  })

  it('is publicly readable', async () => {
    const { error } = await anonClient.from('mural_entries').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('shows a live auto-entry for a "done" row with no manual post', async () => {
    const clientA = await clientForUser(userA.email)
    await clientA
      .from('completions')
      .upsert({ user_id: userA.id, course_id: courseWithBadgeId, status: 'done' }, { onConflict: 'user_id,course_id' })

    const { data } = await anonClient
      .from('mural_entries')
      .select('*')
      .eq('user_id', userA.id)
      .eq('course_id', courseWithBadgeId)
    expect(data).toHaveLength(1)
    expect(data?.[0].source).toBe('auto')
    expect(data?.[0].image_path).toBe('mural-test-badge.png')

    await clientA.from('completions').delete().eq('user_id', userA.id).eq('course_id', courseWithBadgeId)
  })

  it('does not show an auto-entry once the user has a manual post for that course', async () => {
    const clientB = await clientForUser(userB.email)
    await clientB
      .from('completions')
      .upsert({ user_id: userB.id, course_id: courseNoPostId, status: 'done' }, { onConflict: 'user_id,course_id' })
    const { data: manualPost } = await clientB
      .from('badge_posts')
      .insert({ user_id: userB.id, course_id: courseNoPostId, image_path: `${userB.id}/manual.jpg` })
      .select()
      .single()

    const { data } = await anonClient
      .from('mural_entries')
      .select('*')
      .eq('user_id', userB.id)
      .eq('course_id', courseNoPostId)
    expect(data).toHaveLength(1)
    expect(data?.[0].source).toBe('manual')

    await serviceClient.from('badge_posts').delete().eq('id', manualPost!.id)
    await clientB.from('completions').delete().eq('user_id', userB.id).eq('course_id', courseNoPostId)
  })

  it('never exposes a "not done" completion (interested-only stays private)', async () => {
    const clientA = await clientForUser(userA.email)
    await clientA
      .from('completions')
      .upsert({ user_id: userA.id, course_id: courseWithBadgeId, status: 'interested' }, { onConflict: 'user_id,course_id' })

    const { data } = await anonClient
      .from('mural_entries')
      .select('*')
      .eq('user_id', userA.id)
      .eq('course_id', courseWithBadgeId)
    expect(data).toHaveLength(0)

    await clientA.from('completions').delete().eq('user_id', userA.id).eq('course_id', courseWithBadgeId)
  })
})
