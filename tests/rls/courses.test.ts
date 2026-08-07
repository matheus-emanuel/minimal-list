import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { anonClient, createTestUser, clientForUser, cleanupUser, promoteToSysadmin, serviceClient } from './helpers'

describe('courses RLS', () => {
  let user: { id: string; email: string }
  let sysadmin: { id: string; email: string }
  let courseId = ''

  beforeAll(async () => {
    user = await createTestUser('courses-user')
    sysadmin = await createTestUser('courses-admin')
    await promoteToSysadmin(sysadmin.id)
  })

  afterAll(async () => {
    if (courseId) await serviceClient.from('courses').delete().eq('id', courseId)
    await cleanupUser(user.id)
    await cleanupUser(sysadmin.id)
  })

  it('allows anonymous read', async () => {
    const { error } = await anonClient.from('courses').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('blocks a regular user from inserting a course', async () => {
    const clientUser = await clientForUser(user.email)
    const { error } = await clientUser
      .from('courses')
      .insert({ title: 'Should fail', url: 'https://example.com', category: 'Test' })
    expect(error).not.toBeNull()
  })

  it('allows a sysadmin to insert, update and delete a course', async () => {
    const clientAdmin = await clientForUser(sysadmin.email)

    const { data: inserted, error: insertError } = await clientAdmin
      .from('courses')
      .insert({ title: 'RLS Test Course', url: 'https://example.com', category: 'Test' })
      .select()
      .single()
    expect(insertError).toBeNull()
    courseId = inserted!.id

    const { error: updateError } = await clientAdmin
      .from('courses')
      .update({ title: 'RLS Test Course Updated' })
      .eq('id', courseId)
    expect(updateError).toBeNull()

    const { error: deleteError } = await clientAdmin.from('courses').delete().eq('id', courseId)
    expect(deleteError).toBeNull()
    courseId = ''
  })
})
