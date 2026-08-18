import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'Course Tracker',
  description: 'Acompanhe seu progresso em cursos e certificações gratuitas',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <div className="flex gap-4">
              <Link href="/" className="font-semibold">
                Cursos
              </Link>
              <Link href="/badges">Mural de Badges</Link>
              {user && <Link href="/admin">Admin</Link>}
            </div>
            <div>
              {user ? (
                <form action={signOut}>
                  <button type="submit" className="text-sm text-slate-600">
                    Sair
                  </button>
                </form>
              ) : (
                <Link href="/login" className="text-sm text-slate-600">
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
