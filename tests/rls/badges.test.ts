import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { anonClient, createTestUser, clientForUser, cleanupUser, serviceClient } from './helpers'

describe('badge_posts RLS and rate limiting', () => {
  let user: { id: string; email: string }
  const postIds: string[] = []

  beforeAll(async () => {
    user = await createTestUser('badges-user')
  })

  afterAll(async () => {
    await serviceClient.from('badge_posts').delete().in('id', postIds)
    await cleanupUser(user.id)
  })

  it('allows anonymous read of badge posts', async () => {
    const { error } = await anonClient.from('badge_posts').select('id').limit(1)
    expect(error).toBeNull()
  })

  it('allows a user to insert their own badge post', async () => {
    const clientUser = await clientForUser(user.email)
    const { data, error } = await clientUser
      .from('badge_posts')
      .insert({ user_id: user.id, image_path: `${user.id}/test.jpg` })
      .select()
      .single()
    expect(error).toBeNull()
    if (data) postIds.push(data.id)
  })

  it('blocks a user from inserting a badge post for another user', async () => {
    const clientUser = await clientForUser(user.email)
    const otherId = '00000000-0000-0000-0000-000000000000'
    const { error } = await clientUser
      .from('badge_posts')
      .insert({ user_id: otherId, image_path: `${otherId}/test.jpg` })
    expect(error).not.toBeNull()
  })

  it(
    'rejects the 11th upload within 24h via the rate-limit trigger',
    async () => {
      const clientUser = await clientForUser(user.email)

      for (let i = postIds.length; i < 10; i++) {
        const { data, error } = await clientUser
          .from('badge_posts')
          .insert({ user_id: user.id, image_path: `${user.id}/test-${i}.jpg` })
          .select()
          .single()
        expect(error).toBeNull()
        if (data) postIds.push(data.id)
      }

      const { error: eleventhError } = await clientUser
        .from('badge_posts')
        .insert({ user_id: user.id, image_path: `${user.id}/test-11.jpg` })
      expect(eleventhError).not.toBeNull()
      expect(eleventhError?.message).toContain('upload_rate_limit_exceeded')
    },
    20000
  )
})
