import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { anonClient, createTestUser, clientForUser, cleanupUser, promoteToSysadmin, serviceClient } from './helpers'

describe('sessions RLS', () => {
  let user: { id: string; email: string }
  let sysadmin: { id: string; email: string }
  let sessionId = ''

  beforeAll(async () => {
    user = await createTestUser('sessions-user')
    sysadmin = await createTestUser('sessions-admin')
    await promoteToSysadmin(sysadmin.id)
  })

  afterAll(async () => {
    if (sessionId) await serviceClient.from('sessions').delete().eq('id', sessionId)
    await cleanupUser(user.id)
    await cleanupUser(sysadmin.id)
  })

  it('allows anonymous read', async () => {
    const { error } = await anonClient.from('sessions').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('blocks a regular user from inserting a session', async () => {
    const clientUser = await clientForUser(user.email)
    const { error } = await clientUser.from('sessions').insert({ name: 'Should fail' })
    expect(error).not.toBeNull()
  })

  it('allows a sysadmin to insert, update and delete a session', async () => {
    const clientAdmin = await clientForUser(sysadmin.email)

    const { data: inserted, error: insertError } = await clientAdmin
      .from('sessions')
      .insert({ name: 'RLS Test Session' })
      .select()
      .single()
    expect(insertError).toBeNull()
    sessionId = inserted!.id

    const { error: updateError } = await clientAdmin
      .from('sessions')
      .update({ sort_order: 5 })
      .eq('id', sessionId)
    expect(updateError).toBeNull()

    const { error: deleteError } = await clientAdmin.from('sessions').delete().eq('id', sessionId)
    expect(deleteError).toBeNull()
    sessionId = ''
  })
})
