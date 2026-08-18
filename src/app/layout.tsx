import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { Footer } from '@/components/footer'
import { CookieConsent } from '@/components/cookie-consent'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'minimal-list',
  description: 'Treinamentos gratuitos que dão badge, de provedores oficiais como Databricks, Oracle Cloud e outros.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from('profiles').select('display_name, avatar_url, role').eq('id', user.id).single()).data
    : null

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-canvas text-strong">
        <ThemeProvider>
          <nav className="border-b border-border bg-subtle">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
              <Link href="/" className="font-semibold text-strong">
                minimal-list
              </Link>
              <div className="flex items-center gap-4 text-sm">
                {user && (
                  <Link href="/badges" className="text-muted hover:text-strong">
                    Mural de Badges
                  </Link>
                )}
                <ThemeToggle />
                {user ? (
                  <UserMenu
                    displayName={profile?.display_name ?? null}
                    email={user.email ?? ''}
                    avatarUrl={profile?.avatar_url ?? null}
                  />
                ) : (
                  <Link href="/login" className="text-muted hover:text-strong">
                    Entrar
                  </Link>
                )}
              </div>
            </div>
          </nav>
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
          <Footer />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  )
}
