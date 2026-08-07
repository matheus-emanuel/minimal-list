# BRAINSTORM: Course Tracker

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | COURSE_TRACKER |
| **Date** | 2026-08-06 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Shipped |

---

## Initial Idea

**Raw Input (original, pt-BR):** "eu quero criar um app web que sejá rápido, otimizado e seguro. A ideia é ter uma lista de cursos recomendada realmente como uma lista onde cada curso pode ser marcado como concluído de forma individual, mas para isso precisa estar logado em uma conta. Caso contrário só poderá ver a lista. Existirá duas roles, uma de sysadmin onde será possível adicionar, remover e alterar os cursos e uma de usuário que será possível acessar a própria conta e checkar o que está marcado. Também quero que haja um espaço em comum onde os usuários consigam compartilhar as fotos dos badges dos cursos. A stack deve ser gratuita, pode ser com supabase + vercel + algo web"

**Context Gathered:**
- Empty project directory except for one seed file: `Cursos indicados.md` — a personal roadmap of free certifications, organized by category (Scrum, SQL, Databricks x5 subcategories, Oracle Cloud), each item a markdown checkbox with a link.
- No existing code, no git repo, no framework chosen yet — greenfield build.
- User profile (from memory/history): data engineering background (Databricks, Snowflake, Airflow, dbt, Kafka), so the course list content itself is technical/certification-oriented — informs realistic data volume (dozens to low hundreds of courses, not thousands).

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | New Next.js app at project root | Greenfield — no existing structure to conform to |
| Relevant KB Domains | supabase-specialist, Next.js/Vercel deployment patterns | RLS-first security model, SSR route protection |
| IaC Patterns | N/A — Vercel + Supabase are managed platforms | No custom infra; rely on platform free tiers |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Quem vai usar o app? | Público aberto — qualquer pessoa pode se cadastrar; usuário segue sendo o único sysadmin | Precisa de signup público seguro + role default `user`; sysadmin promovido manualmente (não via UI de signup) |
| 2 | Como as pessoas logam? | Email + senha, com magic link | Usa Supabase Auth nativo, sem dependência de OAuth externo |
| 3 | Estrutura dos cursos? | Categoria fixa + tags livres | Modelo de dados: `courses.category` (enum/texto) + `tags text[]`, espelhando o arquivo `Cursos indicados.md` |
| 4 | Como o mural de badges funciona? | Feed cronológico com curtidas/reações | Precisa de tabela de posts + tabela de reações (like único por usuário/post) |
| 5 | Nível de proteção contra abuso? | Básico: limites de upload + botão de denúncia (sem aprovação prévia) | Precisa de rate limiting simples + tabela `badge_reports` revisável pelo sysadmin |
| 6 | Framework de frontend? | Sem preferência — IA escolhe | Recomendado Next.js App Router (ver Approaches) |

**Minimum Questions:** 3 (met — 6 asked)

**Follow-up clarification:** Ao validar o modelo de dados, o usuário confirmou explicitamente que **não é necessário notificar quando alguém curtir um post** — reforça o corte de "Notificações" já proposto no YAGNI abaixo.

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Input files | `Cursos indicados.md` | 1 file, ~25 cursos em 7 categorias | Estrutura real de categorias (Scrum, SQL, Databricks x5, Oracle Cloud) + seção "a pesquisar" (Microsoft Learn, GCP, Snowflake, Kafka, Airflow, MongoDB, Neo4j, Elastic, dbt, GitHub) |
| Output examples | N/A | — | — |
| Ground truth | N/A | — | — |
| Related code | N/A (greenfield) | — | — |

**How samples will be used:**
- `Cursos indicados.md` vira o **seed data** inicial da tabela `courses` (migração/script de import).
- As categorias existentes (Scrum, SQL, Databricks — subdividido, Oracle Cloud) definem os valores iniciais de `category`.
- A seção "Certificações para Pesquisar e Adicionar" confirma que `tags` livres são necessárias (itens ainda sem categoria definida).

---

## Approaches Explored

### Approach A: Next.js (App Router) + Supabase + Vercel ⭐ Recomendada

**Description:** Next.js 14+ com App Router e React Server Components, Supabase para Auth + Postgres (com RLS) + Storage (fotos de badge), deploy na Vercel. Uso de `@supabase/ssr` para sessão server-side.

**Pros:**
- Server Components protegem páginas de sysadmin no servidor — sem "flash" de conteúdo restrito antes do redirect.
- Menos JS enviado ao cliente (alinhado com "rápido/otimizado").
- Integração Next.js + Supabase + Vercel é a mais madura e documentada do ecossistema — menor risco de bugs de sessão/segurança em um app que lida com roles.
- Vercel + Supabase free tier cobrem confortavelmente a escala esperada (público aberto, mas volume pequeno/médio).

**Cons:**
- Curva de aprendizado de Server/Client Components se o usuário não tiver experiência prévia com Next.js.

**Why Recommended:** Confirmado pelo usuário na validação incremental. Melhor equilíbrio entre segurança (SSR + RLS), performance (RSC) e maturidade do ecossistema gratuito.

---

### Approach B: SvelteKit + Supabase + Vercel

**Description:** Mesma base de backend (Supabase + Vercel), trocando o frontend por SvelteKit.

**Pros:**
- Bundle final ainda mais leve no client.
- Sintaxe mais simples para quem não conhece React.

**Cons:**
- Ecossistema de exemplos prontos de integração Supabase (RLS + SSR + roles) é menor — mais tempo gasto resolvendo problemas sem referência direta.
- Menor precedente de produção comparado a Next.js + Vercel (mesma empresa).

**Why not chosen:** Usuário optou por manter a opção com mais maturidade de integração (Approach A).

---

## Data Engineering Context

Não aplicável — este é um app CRUD + auth + upload de imagens, não um pipeline de dados. (O conteúdo do app é sobre cursos de engenharia de dados, mas a arquitetura do app em si é um webapp convencional.)

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A — Next.js (App Router) + Supabase + Vercel |
| **User Confirmation** | 2026-08-06, via validação incremental |
| **Reasoning** | Segurança residente no RLS do Postgres (independe do framework), mas Next.js oferece melhor DX/maturidade para proteger rotas de sysadmin no servidor e menor bundle client — alinhado a "rápido, otimizado e seguro" |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Cadastro público aberto, sysadmin único promovido manualmente | Usuário quer abrir para qualquer pessoa, mas mantém controle total sobre quem administra cursos | Grupo fechado por convite; app 100% pessoal sem multiusuário |
| 2 | Auth via email/senha + magic link (Supabase Auth nativo) | Simplicidade, sem setup de OAuth apps externos | OAuth Google/GitHub |
| 3 | Cursos com categoria fixa + tags livres | Espelha a estrutura real do arquivo seed e permite itens "a categorizar" | Lista simples sem categoria; só tags sem categoria fixa |
| 4 | Mural de badges como feed cronológico com curtidas (reação única "like") | Dá um toque social sem a complexidade de múltiplos tipos de reação ou comentários | Galeria agrupada por curso; feed sem nenhuma interação |
| 5 | Moderação básica: limites de upload (tamanho/formato/rate limit) + denúncia manual revisada pelo sysadmin | Proporcional ao risco real de uma base pequena/inicial de usuários, sem a fricção de aprovação prévia | Aprovação prévia de toda foto; nenhuma proteção além do sysadmin remover depois |
| 6 | Segurança de dados garantida via RLS no Postgres, independente do framework escolhido | RLS garante isolamento mesmo se houver bug no frontend | Confiar apenas em checagens no client/servidor de aplicação |
| 7 | Next.js App Router como framework | Melhor integração SSR + Supabase + Vercel, menor bundle, mais exemplos de referência | SvelteKit |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Comentários no feed de badges | Não pedido; curtida já dá o toque social necessário para o MVP | Sim |
| Múltiplos tipos de reação (emoji picker) | Complexidade desnecessária vs. um único "like" | Sim |
| Aprovação prévia de posts de badge | Usuário escolheu explicitamente "básico: limite + denunciar" em vez de fricção de aprovação manual | Sim |
| Notificações (ex: "fulano curtiu seu post") | Confirmado explicitamente pelo usuário como desnecessário | Sim |
| Busca/filtro avançado (full-text search) | Filtro simples por categoria/tag já resolve para o volume esperado (dezenas de cursos) | Sim |
| Histórico/analytics de progresso do usuário | Não mencionado; fora do escopo do MVP de "marcar concluído" | Sim |
| OAuth social (Google/GitHub) | Usuário escolheu email/senha + magic link como suficiente | Sim |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Escolha de stack/framework (Approach A vs B) | ✅ | Confirmou Next.js + Supabase + Vercel | Não |
| Modelo de dados + cortes de escopo (YAGNI) | ✅ | Confirmou, reforçando o corte de notificações de curtida | Não |

**Minimum Validations:** 2 (met — 2 completed)

---

## Suggested Requirements for /define

### Problem Statement (Draft)
Criar um app web público, rápido e seguro para acompanhar o progresso pessoal em uma lista curada de cursos/certificações gratuitas, com controle de conteúdo centralizado (sysadmin) e um espaço social para compartilhar conquistas (fotos de badges).

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Usuário anônimo/visitante | Quer ver quais cursos existem sem precisar criar conta |
| Usuário logado | Quer marcar individualmente quais cursos já concluiu e ver seu progresso |
| Sysadmin | Quer manter a lista de cursos atualizada (adicionar/editar/remover) sem depender de deploy de código |

### Success Criteria (Draft)
- [ ] Visitante não-logado consegue ver a lista completa de cursos (categoria + tags), mas não consegue marcar conclusão
- [ ] Usuário logado consegue marcar/desmarcar cursos individualmente como concluído, persistente entre sessões
- [ ] Sysadmin consegue criar, editar e remover cursos via UI, sem tocar em código
- [ ] Usuário logado consegue postar foto de badge (com limite de tamanho/formato) e curtir posts de outros
- [ ] Qualquer usuário logado consegue denunciar um post; sysadmin vê fila de denúncias e pode remover
- [ ] Toda regra de acesso (quem lê/escreve o quê) é garantida via RLS no Postgres, não só na camada de aplicação
- [ ] App roda inteiramente em free tier (Vercel + Supabase), sem custo recorrente

### Constraints Identified
- Stack deve ser 100% gratuita: Next.js + Supabase (free tier) + Vercel (free tier)
- Sem orçamento para serviços pagos de moderação de imagem ou CDN adicional
- Volume esperado: dezenas de cursos, base de usuários pequena/média inicialmente

### Out of Scope (Confirmed)
- Comentários em posts de badge
- Múltiplos tipos de reação
- Aprovação prévia de conteúdo antes de publicar
- Notificações (push, email, in-app)
- Busca full-text avançada
- Login social (Google/GitHub)
- Analytics/histórico de progresso do usuário

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 6 |
| Approaches Explored | 2 |
| Features Removed (YAGNI) | 7 |
| Validations Completed | 2 |
| Duration | ~1 sessão interativa |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_COURSE_TRACKER.md`
