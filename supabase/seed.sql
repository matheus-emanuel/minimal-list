-- Seed data imported from "docs/certifications-backlog.md" (2026-08-06),
-- session grouping reorganized 2026-08-18 to match the source doc's own
-- training-type categorization (Academy Accreditation / Academy Course /
-- Knowledge Badge / Partner Training for Databricks; "Certificação" for
-- HackerRank/Oracle/Scrumstudy). Applied automatically by `supabase db reset`,
-- which resets the DB before reseeding — no ON CONFLICT handling needed for
-- local dev idempotency.
--
-- sessions.badge_image_path is a provider-level logo fallback (DESIGN
-- Decision 3 + migration 0015): every course below has no badge of its own,
-- so all of them inherit their session's logo automatically. Files live in
-- the "course-badges" bucket under providers/*.svg — on a fresh
-- `supabase db reset`, re-upload them once (see BUILD_REPORT for the exact
-- curl commands); seed.sql only sets the DB column, Storage objects aren't
-- part of a SQL migration/seed.

insert into public.sessions (name, badge_image_path) values
  ('Scrumstudy - Certificação', 'providers/scrum.svg'),
  ('HackerRank - Certificação', 'providers/hackerrank.svg'),
  ('Databricks - Academy Accreditation', 'providers/databricks.svg'),
  ('Databricks - Academy Course', 'providers/databricks.svg'),
  ('Databricks - Knowledge Badge', 'providers/databricks.svg'),
  ('Databricks - Partner Training', 'providers/databricks.svg'),
  ('Oracle Cloud Infrastructure (OCI) - Certificação', 'providers/oracle.svg');

insert into public.courses (title, url, session_id, tags) values
  ('Scrum Fundamentals Certified (SFC) – Scrumstudy', 'https://www.scrumstudy.com/portuguese/scrum-fundamentals-certified', (select id from public.sessions where name = 'Scrumstudy - Certificação'), '{}'),

  ('HackerRank – SQL (Basic)', 'https://www.hackerrank.com/skills-verification/sql_basic', (select id from public.sessions where name = 'HackerRank - Certificação'), '{}'),
  ('HackerRank – SQL (Intermediate)', 'https://www.hackerrank.com/skills-verification/sql_intermediate', (select id from public.sessions where name = 'HackerRank - Certificação'), '{}'),
  ('HackerRank – SQL (Advanced)', 'https://www.hackerrank.com/skills-verification/sql_advanced', (select id from public.sessions where name = 'HackerRank - Certificação'), '{}'),

  ('Databricks Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/2308/databricks-fundamentals-accreditation', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{}'),
  ('Platform Administrator Accreditation', 'https://partner-academy.databricks.com/learn/learning-plans/207/platform-administrator-learning-plan', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{}'),
  ('Azure Databricks Platform Architect Accreditation', 'https://partner-academy.databricks.com/learn/learning-plans/254/azure-databricks-platform-architect-learning-plan', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{azure}'),
  ('Data Governance Fundamentals', 'https://partner-academy.databricks.com/learn/courses/4681/data-governance-fundamentals', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{governance}'),
  ('Generative AI Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/2310/generative-ai-fundamentals-accreditation-portuguese-br', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{genai}'),
  ('AI Agent Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/4503/ai-agent-fundamentals-accreditation', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{genai,agents}'),
  ('Prompt Engineering Fundamentals', 'https://partner-academy.databricks.com/learn/courses/4733/prompt-engineering-fundamentals/', (select id from public.sessions where name = 'Databricks - Academy Accreditation'), '{genai,prompt-engineering}'),

  ('Azure Databricks Foundations', 'https://partner-academy.databricks.com/learn/courses/4889/azure-databricks-foundations', (select id from public.sessions where name = 'Databricks - Academy Course'), '{azure}'),

  ('Data Ingestion with Lakeflow Connect', 'https://partner-academy.databricks.com/learn/course/2963/data-ingestion-with-lakeflow-connect', (select id from public.sessions where name = 'Databricks - Knowledge Badge'), '{lakeflow}'),
  ('SQL Analytics Associate', 'https://partner-academy.databricks.com/learn/courses/3926/sql-analytics-on-databricks', (select id from public.sessions where name = 'Databricks - Knowledge Badge'), '{sql}'),
  ('Data Warehousing with Databricks', 'https://partner-academy.databricks.com/learn/courses/4021/data-warehousing-with-databricks', (select id from public.sessions where name = 'Databricks - Knowledge Badge'), '{}'),
  ('Introduction to Apache Spark', 'https://partner-academy.databricks.com/learn/course/3901/introduction-to-apache-spark', (select id from public.sessions where name = 'Databricks - Knowledge Badge'), '{spark}'),
  ('Building Single-Agent Applications on Databricks', 'https://partner-academy.databricks.com/learn/courses/2716/building-single-agent-applications-on-databricks', (select id from public.sessions where name = 'Databricks - Knowledge Badge'), '{genai,agents}'),

  ('FSI Gen AI & LLM on Databricks PreSales Partner Badge', 'https://partner-academy.databricks.com/learn/courses/3449/industry-fsi-gen-ai-llm-on-databricks-presales-partner-badge/lessons', (select id from public.sessions where name = 'Databricks - Partner Training'), '{fsi,presales}'),
  ('Energy Gen AI & LLM on Databricks PreSales Partner Badge', 'https://partner-academy.databricks.com/learn/courses/3528/industry-energy-gen-ai-llm-on-databricks-presales-partner-badge', (select id from public.sessions where name = 'Databricks - Partner Training'), '{energy,presales}'),
  ('SAP Foundations for Partners', 'https://partner-academy.databricks.com/learn/courses/3735/sap-gtm-foundations-for-partners/', (select id from public.sessions where name = 'Databricks - Partner Training'), '{sap,presales}'),
  ('Advantages of Data Interoperability with SAP', 'https://partner-academy.databricks.com/learn/courses/3580/leadership-advantages-of-data-interoperability-with-sap', (select id from public.sessions where name = 'Databricks - Partner Training'), '{sap}'),

  ('Oracle Cloud Infrastructure Foundations 2025 Certified Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oci-foundations-associate-2025/148056', (select id from public.sessions where name = 'Oracle Cloud Infrastructure (OCI) - Certificação'), '{}'),
  ('Oracle Cloud Data Platform Foundations 2025 Certified Foundations Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oracle-data-platform-foundations-associate-2025/148510', (select id from public.sessions where name = 'Oracle Cloud Infrastructure (OCI) - Certificação'), '{}'),
  ('OCI AI Foundations Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oci-ai-foundations-associate-2025/147781', (select id from public.sessions where name = 'Oracle Cloud Infrastructure (OCI) - Certificação'), '{genai}');

-- The original file's "Certificações para Pesquisar e Adicionar" section (Microsoft
-- Learn, Google Cloud Skills Boost, Snowflake, Confluent Kafka, Astronomer/Airflow,
-- MongoDB University, Neo4j, Elastic, dbt Learn, GitHub Foundations) has no links yet
-- and is intentionally left out of the seed — it's future curation work for the
-- sysadmin via /admin, not seed data.
--
-- "Databricks Lakehouse Fundamentals" (Academy Accreditation) is also excluded —
-- confirmed broken/unavailable (Japanese/Korean only), matching the note already
-- recorded here since the original import.
