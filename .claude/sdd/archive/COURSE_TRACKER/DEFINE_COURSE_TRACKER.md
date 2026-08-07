# DEFINE: Course Tracker

> App web público para acompanhar progresso em uma lista curada de cursos/certificações gratuitas, com administração centralizada e um mural social de badges.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | COURSE_TRACKER |
| **Date** | 2026-08-06 |
| **Author** | define-agent |
| **Status** | ✅ Shipped |
| **Clarity Score** | 15/15 |

---

## Problem Statement

Quem quer seguir um roteiro de certificações gratuitas (ex: Databricks, SQL, Oracle Cloud) não tem um jeito rápido e confiável de acompanhar o próprio progresso nem de comemorar conquistas junto com outras pessoas — hoje isso vive em um checklist markdown estático, sem estado por usuário, sem controle de quem edita a lista, e sem lugar pra compartilhar os badges conquistados.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Visitante anônimo | Não autenticado | Quer conferir rapidamente quais cursos existem antes de se comprometer a criar conta |
| Usuário logado | `user` (padrão no cadastro) | Quer marcar individualmente quais cursos já concluiu e ver isso persistir entre sessões/dispositivos |
| Sysadmin | `sysadmin` (promovido manualmente) | Quer manter a lista de cursos atualizada (criar, editar, remover) sem depender de deploy de código, e moderar o mural de badges |

---

## Goals

| Priority | Goal |
|----------|------|
| **MUST** | Visitante anônimo consegue ver a lista completa de cursos (categoria + tags) sem login |
| **MUST** | Usuário logado marca/desmarca cursos individualmente como concluído, de forma persistente |
| **MUST** | Sysadmin realiza CRUD completo de cursos via UI, sem tocar em código |
| **MUST** | Toda regra de acesso (quem lê/escreve o quê) é garantida via RLS no Postgres, não só na aplicação |
| **SHOULD** | Usuário logado publica foto de badge no mural comum e curte posts de outros usuários |
| **SHOULD** | Usuário logado denuncia um post impróprio; sysadmin revisa fila de denúncias e remove conteúdo |
| **COULD** | Filtro por categoria e por tag na listagem pública de cursos |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists (ex: sysadmin remove posts direto no Supabase Studio sem UI de denúncia)
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

- [ ] Lighthouse Performance score ≥ 90 (mobile) na página pública de listagem de cursos
- [ ] Carregamento inicial da lista de cursos (visitante anônimo) em ≤ 2s via SSR/Vercel Edge
- [ ] Upload de foto de badge limitado a 5MB por arquivo, formatos JPEG/PNG/WebP
- [ ] Rate limit de no máximo 10 uploads de badge por usuário por dia
- [ ] 100% das tabelas com dados sensíveis por usuário (`completions`, `badge_posts`, `badge_reactions`, `badge_reports`) protegidas por RLS policy testável (nenhum acesso cross-user via API direta)
- [ ] App opera inteiramente dentro do free tier: Supabase (500MB DB, 1GB Storage, 50k MAU) e Vercel (100GB bandwidth/mês), custo mensal = R$0

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Visitante vê lista sem marcar | Usuário não autenticado acessa a home | Visualiza a lista de cursos | Vê todos os cursos com categoria/tags; checkbox de "concluído" não é interativo (ou exibe CTA de login) |
| AT-002 | Usuário marca curso como concluído | Usuário autenticado logado, curso não marcado | Clica no checkbox do curso | Curso fica marcado como concluído, persiste no banco e continua marcado após reload/nova sessão |
| AT-003 | Sysadmin cria curso | Usuário com role `sysadmin` logado, no painel admin | Cria curso com título, url, categoria e tags | Curso aparece imediatamente na listagem pública para todos os usuários |
| AT-004 | Usuário comum bloqueado do admin | Usuário com role `user` logado | Tenta acessar rota `/admin` ou chamar API de escrita em `courses` diretamente | Bloqueado tanto na UI (redirect) quanto no banco (RLS nega o insert/update/delete) |
| AT-005 | Upload de badge e curtida | Usuário autenticado logado | Envia foto de badge (≤5MB, JPEG/PNG/WebP) vinculada a um curso | Post aparece no feed cronológico, visível a todos (mesmo deslogados); outro usuário logado consegue curtir uma única vez |
| AT-006 | Denúncia de post | Usuário autenticado vê um post impróprio | Clica em "denunciar" e confirma motivo | Post entra na fila de denúncias (visível só ao sysadmin), que pode remover o post a partir dali |
| AT-007 | Limite de upload excedido | Usuário autenticado logado | Tenta enviar imagem de 8MB ou 11º upload do dia | Upload é rejeitado com mensagem clara, sem gravar no Storage |

---

## Out of Scope

- Comentários em posts de badge
- Múltiplos tipos de reação (só um "like")
- Aprovação prévia de conteúdo antes de publicar no mural
- Notificações (push, email, in-app) — incluindo notificar curtidas
- Busca full-text avançada (fica só filtro por categoria/tag)
- Login social (Google/GitHub) — só email/senha + magic link
- Analytics/histórico de progresso do usuário além do estado atual (concluído/não concluído)

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Resource | Stack 100% gratuita: Next.js + Supabase (free tier) + Vercel (free tier) | Design deve evitar serviços pagos (moderação de imagem paga, CDN extra, e-mail transacional pago) |
| Technical | Autenticação via Supabase Auth nativo (email/senha + magic link), sem OAuth externo | Simplifica fluxo de signup, sem necessidade de configurar apps OAuth |
| Technical | Segurança de acesso deve residir em RLS do Postgres, não apenas em checagens client/server da aplicação | Toda tabela nova precisa de policy explícita antes de ir pra produção |
| Resource | Volume esperado: dezenas de cursos, base de usuários pequena/média no lançamento | Não justifica otimizações de escala prematura (ex: cache distribuído, CDN de imagens dedicado) |

---

## Technical Context

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | Novo projeto Next.js (App Router) na raiz de `minimal-list/` | Greenfield — projeto vazio hoje, só tem o markdown seed |
| **KB Domains** | `supabase-specialist` (RLS, Auth, Storage) | Consultar padrões de RLS policy e `@supabase/ssr` para App Router |
| **IaC Impact** | Nenhum IaC customizado — Supabase e Vercel são plataformas gerenciadas | Provisionamento via dashboard/CLI dos próprios serviços (migrations SQL do Supabase versionadas no repo) |

---

## Assumptions

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | Meta de Lighthouse ≥90 e carregamento ≤2s são alcançáveis com Next.js SSR/RSC no free tier da Vercel | Ajustar meta numérica ou investir mais em otimização (imagens, code splitting) — não muda a arquitetura | [ ] |
| A-002 | Limite de 5MB/upload e 10 uploads/dia por usuário é suficiente para uso normal e barato o bastante pro free tier de Storage (1GB) | Ajustar limites nas configs da aplicação — mudança de baixo risco, não estrutural | [ ] |
| A-003 | Volume de usuários e dados no lançamento cabe confortavelmente no free tier do Supabase (500MB DB, 1GB Storage, 50k MAU) e Vercel (100GB bandwidth) | Precisaria migrar para tier pago do Supabase/Vercel ou implementar limites mais agressivos de retenção de imagem | [ ] |
| A-004 | Um único "like" por post (sem múltiplas reações) é social o suficiente para o mural de badges | Reintroduzir múltiplas reações no backlog pós-MVP | [ ] |

**Note:** Validate critical assumptions before DESIGN phase. Unvalidated assumptions become risks.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Problema específico, herdado de um caso real (checklist markdown estático do próprio usuário) |
| Users | 3 | 3 personas com pain points distintos, já mapeadas para roles concretas (`anônimo`, `user`, `sysadmin`) |
| Goals | 3 | Priorização MUST/SHOULD/COULD derivada diretamente das decisões já validadas no BRAINSTORM |
| Success | 3 | Critérios quantificados (Lighthouse, tempo de carregamento, limites de upload, cobertura de RLS) — números definidos como suposições razoáveis, marcados em Assumptions para validação |
| Scope | 3 | Out of Scope explícito e já confirmado pelo usuário nas validações incrementais do BRAINSTORM |
| **Total** | **15/15** | |

**Minimum to proceed: 12/15** ✅

---

## Open Questions

None — ready for Design. As únicas incertezas restantes são números específicos (limites de upload, meta de Lighthouse) documentados em Assumptions; são de baixo risco arquitetural e podem ser ajustados sem impacto no design geral.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-06 | define-agent | Versão inicial, extraída do BRAINSTORM_COURSE_TRACKER.md |
| 1.1 | 2026-08-06 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/design .claude/sdd/features/DEFINE_COURSE_TRACKER.md`
