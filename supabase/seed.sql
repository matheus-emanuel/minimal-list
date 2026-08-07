-- Seed data imported from "Cursos indicados.md" (2026-08-06).
-- Applied automatically by `supabase db reset`, which resets the DB before
-- reseeding — no ON CONFLICT handling needed for local dev idempotency.

insert into public.courses (title, url, category, tags) values
  ('Scrum Fundamentals Certified (SFC) – Scrumstudy', 'https://www.scrumstudy.com/portuguese/scrum-fundamentals-certified', 'Scrum', '{}'),

  ('HackerRank – SQL (Basic)', 'https://www.hackerrank.com/skills-verification/sql_basic', 'SQL', '{}'),
  ('HackerRank – SQL (Intermediate)', 'https://www.hackerrank.com/skills-verification/sql_intermediate', 'SQL', '{}'),
  ('HackerRank – SQL (Advanced)', 'https://www.hackerrank.com/skills-verification/sql_advanced', 'SQL', '{}'),

  ('Databricks Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/2308/databricks-fundamentals-accreditation', 'Databricks - Fundamentos', '{}'),
  ('Azure Databricks Foundations', 'https://partner-academy.databricks.com/learn/courses/4889/azure-databricks-foundations', 'Databricks - Fundamentos', '{azure}'),
  ('Introduction to Apache Spark', 'https://partner-academy.databricks.com/learn/course/3901/introduction-to-apache-spark', 'Databricks - Fundamentos', '{spark}'),

  ('Platform Administrator Accreditation', 'https://partner-academy.databricks.com/learn/learning-plans/207/platform-administrator-learning-plan', 'Databricks - Plataforma e Arquitetura', '{}'),
  ('Azure Databricks Platform Architect Accreditation', 'https://partner-academy.databricks.com/learn/learning-plans/254/azure-databricks-platform-architect-learning-plan', 'Databricks - Plataforma e Arquitetura', '{azure}'),
  ('Data Governance Fundamentals', 'https://partner-academy.databricks.com/learn/courses/4681/data-governance-fundamentals', 'Databricks - Plataforma e Arquitetura', '{governance}'),

  ('Data Ingestion with Lakeflow Connect', 'https://partner-academy.databricks.com/learn/course/2963/data-ingestion-with-lakeflow-connect', 'Databricks - Engenharia de Dados', '{lakeflow}'),
  ('SQL Analytics Associate', 'https://partner-academy.databricks.com/learn/courses/3926/sql-analytics-on-databricks', 'Databricks - Engenharia de Dados', '{sql}'),
  ('Data Warehousing with Databricks', 'https://partner-academy.databricks.com/learn/courses/4021/data-warehousing-with-databricks', 'Databricks - Engenharia de Dados', '{}'),

  ('Generative AI Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/2310/generative-ai-fundamentals-accreditation-portuguese-br', 'Databricks - IA Generativa', '{genai}'),
  ('AI Agent Fundamentals Accreditation', 'https://partner-academy.databricks.com/learn/course/view/elearning/4503/ai-agent-fundamentals-accreditation', 'Databricks - IA Generativa', '{genai,agents}'),
  ('Prompt Engineering Fundamentals', 'https://partner-academy.databricks.com/learn/courses/4733/prompt-engineering-fundamentals/', 'Databricks - IA Generativa', '{genai,prompt-engineering}'),
  ('Building Single-Agent Applications on Databricks', 'https://partner-academy.databricks.com/learn/courses/2716/building-single-agent-applications-on-databricks', 'Databricks - IA Generativa', '{genai,agents}'),

  ('FSI Gen AI & LLM on Databricks PreSales Partner Badge', 'https://partner-academy.databricks.com/learn/courses/3449/industry-fsi-gen-ai-llm-on-databricks-presales-partner-badge/lessons', 'Databricks - Parceiros e Indústria', '{fsi,presales}'),
  ('Energy Gen AI & LLM on Databricks PreSales Partner Badge', 'https://partner-academy.databricks.com/learn/courses/3528/industry-energy-gen-ai-llm-on-databricks-presales-partner-badge', 'Databricks - Parceiros e Indústria', '{energy,presales}'),
  ('SAP Foundations for Partners', 'https://partner-academy.databricks.com/learn/courses/3735/sap-gtm-foundations-for-partners/', 'Databricks - Parceiros e Indústria', '{sap,presales}'),
  ('Advantages of Data Interoperability with SAP', 'https://partner-academy.databricks.com/learn/courses/3580/leadership-advantages-of-data-interoperability-with-sap', 'Databricks - Parceiros e Indústria', '{sap}'),

  ('Oracle Cloud Infrastructure Foundations 2025 Certified Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oci-foundations-associate-2025/148056', 'Oracle Cloud', '{}'),
  ('Oracle Cloud Data Platform Foundations 2025 Certified Foundations Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oracle-data-platform-foundations-associate-2025/148510', 'Oracle Cloud', '{}'),
  ('OCI AI Foundations Associate', 'https://mylearn.oracle.com/ou/learning-path/become-an-oci-ai-foundations-associate-2025/147781', 'Oracle Cloud', '{genai}');

-- The original file's "Certificações para Pesquisar e Adicionar" section (Microsoft
-- Learn, Google Cloud Skills Boost, Snowflake, Confluent Kafka, Astronomer/Airflow,
-- MongoDB University, Neo4j, Elastic, dbt Learn, GitHub Foundations) has no links yet
-- and is intentionally left out of the seed — it's future curation work for the
-- sysadmin via /admin, not seed data.
