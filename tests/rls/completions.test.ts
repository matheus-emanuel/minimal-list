import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createTestUser, clientForUser, cleanupUser, serviceClient, promoteToSysadmin } from './helpers'

describe('completions RLS', () => {
  let userA: { id: string; email: string }
  let userB: { id: string; email: string }
  let sysadmin: { id: string; email: string }
  let courseId: string

  beforeAll(async () => {
    userA = await createTestUser('completions-a')
    userB = await createTestUser('completions-b')
    sysadmin = await createTestUser('completions-admin')
    await promoteToSysadmin(sysadmin.id)

    const { data } = await serviceClient
      .from('courses')
      .insert({ title: 'Completions Test Course', url: 'https://example.com', category: 'Test' })
      .select()
      .single()
    courseId = data!.id
  })

  afterAll(async () => {
    await serviceClient.from('courses').delete().eq('id', courseId)
    await cleanupUser(userA.id)
    await cleanupUser(userB.id)
    await cleanupUser(sysadmin.id)
  })

  it('allows a user to mark and unmark their own completion', async () => {
    const clientA = await clientForUser(userA.email)
    const { error: insertError } = await clientA
      .from('completions')
      .insert({ user_id: userA.id, course_id: courseId })
    expect(insertError).toBeNull()

    const { error: deleteError } = await clientA
      .from('completions')
      .delete()
      .eq('user_id', userA.id)
      .eq('course_id', courseId)
    expect(deleteError).toBeNull()
  })

  it("blocks a user from reading another user's completions", async () => {
    const clientA = await clientForUser(userA.email)
    await clientA.from('completions').insert({ user_id: userA.id, course_id: courseId })

    const clientB = await clientForUser(userB.email)
    const { data } = await clientB.from('completions').select('*').eq('user_id', userA.id)
    expect(data).toEqual([])

    await clientA.from('completions').delete().eq('user_id', userA.id).eq('course_id', courseId)
  })

  it('blocks a user from inserting a completion for another user', async () => {
    const clientB = await clientForUser(userB.email)
    const { error } = await clientB.from('completions').insert({ user_id: userA.id, course_id: courseId })
    expect(error).not.toBeNull()
  })
})
