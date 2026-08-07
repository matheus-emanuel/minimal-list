import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const TEST_PASSWORD = 'test-password-123'

export const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const anonClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function createTestUser(emailPrefix: string) {
  const email = `${emailPrefix}-${crypto.randomUUID()}@example.com`
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`failed to create test user: ${error?.message}`)
  return { id: data.user.id, email }
}

export async function clientForUser(email: string) {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw new Error(`failed to sign in test user: ${error.message}`)
  return client
}

export async function promoteToSysadmin(userId: string) {
  const { error } = await serviceClient.from('profiles').update({ role: 'sysadmin' }).eq('id', userId)
  if (error) throw new Error(`failed to promote user: ${error.message}`)
}

export async function cleanupUser(userId: string) {
  await serviceClient.auth.admin.deleteUser(userId)
}
