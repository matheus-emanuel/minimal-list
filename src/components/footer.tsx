import Link from 'next/link'
import pkg from '../../package.json'

const REPO_URL = 'https://github.com/matheus-emanuel/minimal-list'

export function Footer() {
  return (
    <footer className="border-t border-border bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted sm:flex-row">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span>
            Feito por <span className="text-strong">Matheus Emanuel</span> e{' '}
            <span className="text-strong">Leonardo Chalhoub</span>
          </span>
          <span>Novas contas de sysadmin são criadas apenas pelos autores do site.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-strong">
            Código-fonte no GitHub
          </a>
          <Link href="/privacidade" className="transition-colors hover:text-strong">
            Privacidade
          </Link>
          <span className="tabular-nums">v{pkg.version}</span>
        </div>
      </div>
    </footer>
  )
}
