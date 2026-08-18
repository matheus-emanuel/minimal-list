import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createTestUser, clientForUser, cleanupUser, serviceClient, promoteToSysadmin } from './helpers'

describe('completions RLS', () => {
  let userA: { id: string; email: string }
  let userB: { id: string; email: string }
  let sysadmin: { id: string; email: string }
  let courseId: string

  let sessionId: string

  beforeAll(async () => {
    userA = await createTestUser('completions-a')
    userB = await createTestUser('completions-b')
    sysadmin = await createTestUser('completions-admin')
    await promoteToSysadmin(sysadmin.id)

    const { data: session } = await serviceClient.from('sessions').insert({ name: 'Completions Test Session' }).select().single()
    sessionId = session!.id

    const { data } = await serviceClient
      .from('courses')
      .insert({ title: 'Completions Test Course', url: 'https://example.com', session_id: sessionId })
      .select()
      .single()
    courseId = data!.id
  })

  afterAll(async () => {
    await serviceClient.from('courses').delete().eq('id', courseId)
    await serviceClient.from('sessions').delete().eq('id', sessionId)
    await cleanupUser(userA.id)
    await cleanupUser(userB.id)
    await cleanupUser(sysadmin.id)
  })

  it('allows a user to mark and unmark their own completion', async () => {
    const clientA = await clientForUser(userA.email)
    const { error: insertError } = await clientA
      .from('completions')
      .insert({ user_id: userA.id, course_id: courseId, status: 'done' })
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
    await clientA.from('completions').insert({ user_id: userA.id, course_id: courseId, status: 'done' })

    const clientB = await clientForUser(userB.email)
    const { data } = await clientB.from('completions').select('*').eq('user_id', userA.id)
    expect(data).toEqual([])

    await clientA.from('completions').delete().eq('user_id', userA.id).eq('course_id', courseId)
  })

  it('blocks a user from inserting a completion for another user', async () => {
    const clientB = await clientForUser(userB.email)
    const { error } = await clientB
      .from('completions')
      .insert({ user_id: userA.id, course_id: courseId, status: 'done' })
    expect(error).not.toBeNull()
  })

  it('rejects a status outside interested/done (check constraint)', async () => {
    const clientA = await clientForUser(userA.email)
    const { error } = await clientA
      .from('completions')
      // @ts-expect-error — deliberately invalid to exercise the DB check constraint
      .insert({ user_id: userA.id, course_id: courseId, status: 'not-a-real-status' })
    expect(error).not.toBeNull()
  })

  it('allows a user to cycle their own row: interested -> done', async () => {
    const clientA = await clientForUser(userA.email)
    const { error: interestedError } = await clientA
      .from('completions')
      .upsert({ user_id: userA.id, course_id: courseId, status: 'interested' }, { onConflict: 'user_id,course_id' })
    expect(interestedError).toBeNull()

    const { data: afterInterested } = await clientA
      .from('completions')
      .select('status')
      .eq('user_id', userA.id)
      .eq('course_id', courseId)
      .single()
    expect(afterInterested?.status).toBe('interested')

    const { error: doneError } = await clientA
      .from('completions')
      .upsert({ user_id: userA.id, course_id: courseId, status: 'done' }, { onConflict: 'user_id,course_id' })
    expect(doneError).toBeNull()

    const { data: afterDone } = await clientA
      .from('completions')
      .select('status')
      .eq('user_id', userA.id)
      .eq('course_id', courseId)
      .single()
    expect(afterDone?.status).toBe('done')

    await clientA.from('completions').delete().eq('user_id', userA.id).eq('course_id', courseId)
  })
})
