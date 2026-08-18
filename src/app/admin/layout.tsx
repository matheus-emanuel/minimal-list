import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Server-side, before any admin HTML streams — see DESIGN Decision 4.
  // RLS on courses/badge_reports is still the real enforcement boundary.
  if (profile?.role !== 'sysadmin') redirect('/')

  return (
    <div>
      <nav className="mb-4 flex gap-4 text-sm">
        <a href="/admin" className="font-semibold">
          Cursos
        </a>
        <a href="/admin/reports">Denúncias</a>
      </nav>
      {children}
    </div>
  )
}
