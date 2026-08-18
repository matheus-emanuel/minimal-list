import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export default async function ProfilePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-strong">Perfil</h1>
        <p className="mt-1 text-sm text-muted">
          Sua conta só gerencia sua própria lista de treinamentos — não tem acesso a conteúdo de outras pessoas.
        </p>
      </div>
      <ProfileForm
        initialDisplayName={profile?.display_name ?? ''}
        initialUsername={profile?.username ?? ''}
        initialAvatarUrl={profile?.avatar_url ?? null}
        userId={user.id}
      />
    </div>
  )
}
