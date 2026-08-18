# minimal-list

Um site público para acompanhar **treinamentos gratuitos que dão badge**, oferecidos por provedores oficiais — do tipo que rende um badge de verdade para exibir no LinkedIn.

## Por quê

Treinamento bom, gratuito e oficialmente reconhecido de provedores que importam — Databricks, Oracle Cloud, Google, Microsoft, entre outros — está espalhado pela internet e é fácil de perder de vista. O Leonardo já reuniu uma boa lista, e sempre aparecem novos cursos. O `minimal-list` transforma isso em um roteiro público e sempre atualizado: qualquer pessoa pode navegar, acompanhar o próprio progresso e sair com badges que valem a pena colocar no currículo ou no LinkedIn.

## O que o site faz

- **Público, sem precisar de login.** Todo treinamento é listado com um link real para fazê-lo — nada é bloqueado. Um filtro no topo busca por nome, tag ou provedor.
- **Acompanhamento pessoal por conta própria.** Cadastro com email, senha e nome (sem confirmação por email) para marcar itens num ciclo de 3 estados (neutro → tenho interesse → concluído), exportar sua lista em JSON e montar um perfil público (`/u/{usuario}`) mostrando o que já conquistou.
- **Badges automáticos.** Cada treinamento tem um badge — o oficial, se curado, ou o logo do provedor como padrão (Databricks, Oracle, HackerRank, Scrum) — nunca aparece em branco.
- **Mural de Badges** (`/badges`, exige login) — reúne automaticamente o badge de todo treinamento que você concluiu, sem precisar postar nada; ainda dá pra ver posts manuais da comunidade, com curtidas.
- **Conteúdo gerenciado por sysadmins, direto na lista pública.** Sem painel separado: logado como sysadmin, a própria página inicial ganha setas de reordenar, criar/editar/remover/**mesclar** sessões, e criar/editar/remover/reordenar treinamentos — sem precisar de deploy de código. Novas contas de admin nunca são por autocadastro.

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) — Postgres, Auth, Storage, com todo acesso garantido via Row-Level Security
- Tailwind CSS v4, `next-themes` (claro/escuro, padrão escuro), primitivas estilo shadcn (Radix + class-variance-authority)
- Zod para validação
- Vitest (testes de integração de RLS num Postgres real via `supabase start`); Playwright instalado e configurado, mas ainda sem specs para o redesign — ver `CLAUDE.md`
- Deploy na Vercel; projeto Supabase `lista-minima`

## Como rodar localmente

```bash
npm install
supabase start                 # Postgres, Auth e Storage locais (Docker)
supabase db reset              # aplica migrations + dados de seed
npm run dev                    # SEM sourcear .env.local antes — veja abaixo
```

Este projeto usa **dois** arquivos de ambiente, ambos no `.gitignore`:

| Arquivo | Uso |
|---|---|
| `.env.development.local` | Aponta `npm run dev` para o Supabase **local** (disposable) — crie a partir de `supabase status -o env` |
| `.env.local` | Credenciais do projeto Supabase **real**, usadas só por scripts avulsos (nunca pelo `npm run dev`) |

Se você rodar `npm run dev` depois de ter dado `source .env.local` no mesmo shell, as variáveis do shell vencem as do `.env.development.local` e o app acaba apontando pro projeto real por engano — rode `npm run dev` num shell limpo.

Depois de um `supabase db reset` local, os objetos do Storage (incluindo os logos dos provedores) são apagados — reenvie-os antes de testar qualquer coisa relacionada a badges (veja `CLAUDE.md`, seção "Content curation").

## Estrutura do projeto

```text
src/
  app/
    (auth)/login, (auth)/signup   — autenticação (esqueci a senha, mostrar/lembrar senha)
    esqueci-senha, redefinir-senha — fluxo de recuperação de senha
    admin/                        — CRUD de sessões/treinamentos (ainda funciona, não tem mais link no menu)
    badges/                       — Mural de Badges (exige login)
    perfil/                       — nome, foto, usuário público
    u/[username]/                 — perfil público
    privacidade/                  — política de privacidade
    page.tsx                      — lista pública + painel inline de sysadmin
  components/
    ui/                           — primitivas (Button, Input, Label, Card)
    training-list.tsx, course-row.tsx, session-form.tsx — lista + edição inline
    theme-provider.tsx, theme-toggle.tsx, cookie-consent.tsx, footer.tsx, user-menu.tsx
  lib/
    actions/                      — Server Actions, um arquivo por recurso
    supabase/                     — clients Supabase (client/server/middleware)
    validation/                   — schemas Zod
  middleware.ts                   — middleware de sessão Supabase (Next.js exige em src/ ou na raiz)
tests/
  e2e/                            — Playwright (specs do redesign ainda faltam)
  rls/                            — testes de integração de RLS contra Postgres real (Vitest)
supabase/
  migrations/                     — schema sequencial e aditivo (000N_*.sql, até 0017)
  seed.sql                        — dados de seed, com origem em docs/certifications-backlog.md
docs/
  certifications-backlog.md       — backlog de curadoria em andamento (o que já entrou, o que falta)
.claude/sdd/                      — histórico de spec-driven development (brainstorm → define → design → build → ship)
```

Na raiz do projeto ficam apenas os arquivos que as próprias ferramentas (npm, Next.js, TypeScript, ESLint, PostCSS) exigem nesse local por convenção — `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.env*`, `.gitignore`, `CLAUDE.md`, `README.md`. (`tailwind.config.ts` não existe mais — Tailwind v4 configura tudo via CSS em `src/app/globals.css`.) Nenhum desses arquivos pode ser movido sem quebrar a auto-detecção das ferramentas.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento local |
| `npm run build` / `npm run start` | Build / serve de produção — não rode `build` com o `dev` ligado ao mesmo tempo, os dois disputam o cache `.next` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — testes de integração de RLS (precisa de `supabase start`) |
| `npm run test:e2e` | Playwright (configurado, specs do redesign ainda não escritas) |
| `npm run db:types` | Regenera `src/lib/supabase/types.ts` a partir do banco local — rode de novo a cada migration nova |

## Modelo de acesso

| Quem | O que pode fazer |
|---|---|
| Visitante anônimo | Navegar, buscar/filtrar e abrir todos os links de treinamento |
| Conta comum | Acompanhar seus próprios itens (interesse/concluído), exportar sua lista em JSON, personalizar um perfil público, ver e curtir o Mural de Badges |
| Sysadmin | CRUD completo, reordenação e mesclagem de sessões/treinamentos — tudo inline na página principal — conta criada apenas pelos autores do site |

## Contribuindo com conteúdo

Conhece um curso gratuito que dá badge e ainda não está na lista? Adicione em [`docs/certifications-backlog.md`](docs/certifications-backlog.md) como candidato, ou já cadastre direto pela própria lista, se tiver acesso de sysadmin.

## Histórico do projeto

Este projeto segue um fluxo de spec-driven development — os requisitos, o design e o relatório de build de cada feature ficam registrados em [`.claude/sdd/`](.claude/sdd/). A build original está arquivada em [`.claude/sdd/archive/COURSE_TRACKER/`](.claude/sdd/archive/COURSE_TRACKER/); o redesign atual está documentado em [`.claude/sdd/features/`](.claude/sdd/features/) e [`.claude/sdd/reports/BUILD_REPORT_SITE_REDESIGN.md`](.claude/sdd/reports/BUILD_REPORT_SITE_REDESIGN.md).
