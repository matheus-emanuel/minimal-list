import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { BadgeImage } from '@/components/badge-image'

export function UserMenu({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string | null
  email: string
  avatarUrl: string | null
}) {
  const greetingName = displayName || email

  async function signOut() {
    'use server'
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-strong marker:content-none">
        <BadgeImage src={avatarUrl} alt={greetingName} size={28} />
        <span className="hidden sm:inline">Olá, {greetingName}</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-border bg-subtle p-2 text-sm shadow-lg">
        {!displayName && (
          <p className="mb-2 rounded bg-canvas p-2 text-xs text-muted">
            Ainda não configurou seu nome.{' '}
            <Link href="/perfil" className="underline underline-offset-2 hover:text-strong">
              Defina em Perfil
            </Link>
            .
          </p>
        )}
        <Link href="/perfil" className="block rounded px-2 py-1.5 text-strong hover:bg-canvas">
          Perfil
        </Link>
        <form action={signOut}>
          <button type="submit" className="block w-full rounded px-2 py-1.5 text-left text-strong hover:bg-canvas">
            Sair
          </button>
        </form>
      </div>
    </details>
  )
}
