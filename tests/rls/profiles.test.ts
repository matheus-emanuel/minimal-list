import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createTestUser, clientForUser, cleanupUser } from './helpers'

describe('profiles RLS', () => {
  let userA: { id: string; email: string }
  let userB: { id: string; email: string }

  beforeAll(async () => {
    userA = await createTestUser('profiles-a')
    userB = await createTestUser('profiles-b')
  })

  afterAll(async () => {
    await cleanupUser(userA.id)
    await cleanupUser(userB.id)
  })

  it('allows any authenticated user to read any profile (public read)', async () => {
    const clientA = await clientForUser(userA.email)
    const { data, error } = await clientA.from('profiles').select('id').eq('id', userB.id).single()
    expect(error).toBeNull()
    expect(data?.id).toBe(userB.id)
  })

  it('allows a user to update their own display_name', async () => {
    const clientA = await clientForUser(userA.email)
    const { error } = await clientA
      .from('profiles')
      .update({ display_name: 'Nova Silva' })
      .eq('id', userA.id)
    expect(error).toBeNull()
  })

  it("blocks a user from updating another user's profile", async () => {
    const clientA = await clientForUser(userA.email)
    const { data } = await clientA
      .from('profiles')
      .update({ display_name: 'Hacked' })
      .eq('id', userB.id)
      .select()
    expect(data).toEqual([])
  })

  it('blocks a user from self-promoting to sysadmin (column-level GRANT)', async () => {
    const clientA = await clientForUser(userA.email)
    const { error } = await clientA.from('profiles').update({ role: 'sysadmin' }).eq('id', userA.id)
    expect(error).not.toBeNull()
  })

  it('backfills a unique, non-empty username for every existing profile', async () => {
    const clientA = await clientForUser(userA.email)
    const { data } = await clientA.from('profiles').select('username').eq('id', userA.id).single()
    expect(data?.username).toBeTruthy()
  })

  it('allows a user to change their own username to an unclaimed value', async () => {
    const clientA = await clientForUser(userA.email)
    const newUsername = `rls-test-${crypto.randomUUID()}`
    const { error } = await clientA.from('profiles').update({ username: newUsername }).eq('id', userA.id)
    expect(error).toBeNull()
  })

  it("rejects renaming to another user's username (unique constraint, AT-008)", async () => {
    const clientA = await clientForUser(userA.email)
    const clientB = await clientForUser(userB.email)

    const { data: profileB } = await clientB.from('profiles').select('username').eq('id', userB.id).single()

    const { error } = await clientA.from('profiles').update({ username: profileB!.username }).eq('id', userA.id)
    expect(error).not.toBeNull()
  })
})
