# minimal-list

Um site público para acompanhar **treinamentos gratuitos que dão badge**, oferecidos por provedores oficiais — do tipo que rende um badge de verdade para exibir no LinkedIn.

## Por quê

Treinamento bom, gratuito e oficialmente reconhecido de provedores que importam — Databricks, Oracle Cloud, Google, Microsoft, entre outros — está espalhado pela internet e é fácil de perder de vista. O Leonardo já reuniu uma boa lista, e sempre aparecem novos cursos. O `minimal-list` transforma isso em um roteiro público e sempre atualizado: qualquer pessoa pode navegar, acompanhar o próprio progresso e sair com badges que valem a pena colocar no currículo ou no LinkedIn.

## O que o site faz

- **Público, sem precisar de login.** Todo treinamento é listado com um link real para fazê-lo — nada é bloqueado.
- **Acompanhamento pessoal por conta própria.** Cadastro com email, senha e nome (sem confirmação por email) para marcar itens como "tenho interesse" ou "concluído", exportar sua lista em JSON e montar um perfil público mostrando o que já conquistou.
- **Conteúdo gerenciado por sysadmins.** Um pequeno número de contas administrativas, criadas apenas pelos autores do site, cuida do conteúdo — cria, edita, remove e reordena sessões e itens, sem precisar de deploy de código. Novas contas de admin nunca são por autocadastro.
- **Um mural de badges público.** Treinamentos concluídos aparecem com a imagem oficial do badge, compartilhável e visível para todo mundo.

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) — Postgres, Auth, Storage, com todo acesso garantido via Row-Level Security
- Tailwind CSS, validação com Zod
- Vitest (testes unitários + testes de integração de RLS num Postgres real), Playwright (e2e)
- Deploy na Vercel; projeto Supabase `lista-minima`

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha a URL/chaves do seu projeto Supabase
supabase start                 # Postgres, Auth e Storage locais
supabase db reset              # aplica migrations + dados de seed
npm run dev
```

`.env.local` está no `.gitignore` — nunca commitar. A service role key é usada só por scripts avulsos de seed/admin, nunca pelo app em produção.

## Estrutura do projeto

```text
src/
  app/
    (auth)/login, (auth)/signup — páginas de autenticação
    admin/                      — gerenciamento de conteúdo para sysadmins (protegido por role)
    badges/                     — mural público de badges (uploads da comunidade + reações)
    page.tsx                    — lista pública de treinamentos
  middleware.ts                 — middleware de sessão Supabase (Next.js exige em src/ ou na raiz)
  lib/
    actions/                    — Server Actions, um arquivo por recurso
    supabase/                   — clients Supabase (client/server/middleware)
    validation/                 — schemas Zod
tests/
  e2e/                          — testes end-to-end (Playwright)
  rls/                          — testes de integração de RLS contra Postgres real (Vitest)
  playwright.config.ts, vitest.config.ts — configs dos test runners
supabase/
  migrations/                   — schema sequencial e aditivo (000N_*.sql)
  seed.sql                      — dados de seed, com origem em docs/certifications-backlog.md
docs/
  certifications-backlog.md     — backlog de curadoria em andamento (o que já entrou, o que falta)
.claude/sdd/                    — histórico de spec-driven development (brainstorm → define → design → build → ship)
```

Na raiz do projeto ficam apenas os arquivos que as próprias ferramentas (npm, Next.js, TypeScript, ESLint, PostCSS) exigem nesse local por convenção — `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `.env*`, `.gitignore`, `CLAUDE.md`, `README.md`. Nenhum deles pode ser movido sem quebrar a auto-detecção das ferramentas.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento local |
| `npm run build` / `npm run start` | Build / serve de produção |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — testes unitários + testes de integração de RLS (precisa de `supabase start`) |
| `npm run test:e2e` | Testes end-to-end com Playwright |
| `npm run db:types` | Regenera `lib/supabase/types.ts` a partir do banco local |

## Modelo de acesso

| Quem | O que pode fazer |
|---|---|
| Visitante anônimo | Navegar pela lista completa e por todos os links de treinamento |
| Conta comum | Acompanhar seus próprios itens (interesse/concluído), exportar sua lista em JSON, personalizar um perfil público |
| Sysadmin | CRUD completo + reordenação de sessões e itens, moderação do mural de badges — conta criada apenas pelos autores do site |

## Contribuindo com conteúdo

Conhece um curso gratuito que dá badge e ainda não está na lista? Adicione em [`docs/certifications-backlog.md`](docs/certifications-backlog.md) como candidato, ou já cadastre direto como item pelo painel de admin, se tiver acesso.

## Histórico do projeto

Este projeto segue um fluxo de spec-driven development — os requisitos, o design e o relatório de build de cada feature ficam registrados em [`.claude/sdd/`](.claude/sdd/). A build original está arquivada em [`.claude/sdd/archive/COURSE_TRACKER/`](.claude/sdd/archive/COURSE_TRACKER/); o trabalho em andamento fica em [`.claude/sdd/features/`](.claude/sdd/features/).
