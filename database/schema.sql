BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE oauth_provider AS ENUM ('GOOGLE', 'GITHUB');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('OPENAPI', 'ENTITY_SCHEMA', 'ACTION_SPEC', 'DESIGN_SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gen_status AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Developers + OAuth (identity only) =====
CREATE TABLE IF NOT EXISTS developers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NULL,
  display_name  text NULL,
  avatar_url    text NULL,
  password_hash text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_developers_email_not_null
  ON developers(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id     uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  provider         oauth_provider NOT NULL,
  provider_user_id text NOT NULL,
  email            citext NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_oauth_provider_user UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS ix_oauth_accounts_dev ON oauth_accounts(developer_id);

-- ===== Projects (FE Admin CRUD generation unit) =====
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NULL,

  -- Git + Vercel friendly (optional but useful)
  repo_url      text NULL,     -- https://github.com/org/repo
  default_branch text NULL,    -- main/master
  vercel_project_id text NULL, -- nếu bạn muốn lưu mapping sau này

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_project_owner_name UNIQUE (developer_id, name)
);

CREATE INDEX IF NOT EXISTS ix_projects_dev ON projects(developer_id);

-- ===== Documents: 4 file inputs (OpenAPI, EntitySchema, ActionSpec, DesignSystem) =====
-- Tối giản: mỗi loại doc 1 bản "current". Nếu muốn versioning sau này thì thêm table versions.
CREATE TABLE IF NOT EXISTS project_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type          document_type NOT NULL,
  name          text NOT NULL,          -- openapi.json, entities.json, actions.json, design-system.json
  content_type  text NULL,              -- application/json, text/yaml
  content       text NOT NULL,          -- giữ simple: lưu thẳng text/json/yaml
  sha256        text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ux_project_doc_type UNIQUE (project_id, type)
);

CREATE INDEX IF NOT EXISTS ix_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS ix_project_documents_type ON project_documents(type);
CREATE INDEX IF NOT EXISTS ix_project_documents_sha ON project_documents(sha256);

-- ===== Generation sessions (history) =====
CREATE TABLE IF NOT EXISTS generation_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  provider      text NOT NULL,          -- OPENAI/GEMINI/PERPLEXITY
  model         text NOT NULL,
  status        gen_status NOT NULL DEFAULT 'QUEUED',
  error_message text NULL,

  -- snapshot input hashes (đủ để trace)
  openapi_sha256       text NULL,
  entity_schema_sha256 text NULL,
  action_spec_sha256   text NULL,
  design_system_sha256 text NULL,

  -- output
  output_summary_md text NULL,
  repo_commit_sha   text NULL,
  pr_url            text NULL,
  vercel_deploy_url text NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz NULL
);

CREATE INDEX IF NOT EXISTS ix_gen_sessions_project ON generation_sessions(project_id);
CREATE INDEX IF NOT EXISTS ix_gen_sessions_status ON generation_sessions(status);
CREATE INDEX IF NOT EXISTS ix_gen_sessions_created_at ON generation_sessions(created_at);

COMMIT;

-- 1) add password_hash cho login/register thường
ALTER TABLE developers
  ADD COLUMN IF NOT EXISTS password_hash text NULL;

-- 2) refresh tokens table để logout/revoke
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  revoked_at    timestamptz NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_dev ON refresh_tokens(developer_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ===== New Enums =====
DO $$ BEGIN
  CREATE TYPE api_status AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deployment_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DEPLOYED', 'FAILED', 'ROLLED_BACK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deployment_environment AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== APIs (CMS entity linking to developers + optional project) =====
CREATE TABLE IF NOT EXISTS apis (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_developer_id   uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  project_id           uuid NULL REFERENCES projects(id) ON DELETE SET NULL,
  name                 text NOT NULL,
  description          text NULL,
  base_url             text NULL,
  version              text NULL DEFAULT '1.0.0',
  status               api_status NOT NULL DEFAULT 'ACTIVE',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_apis_owner ON apis(owner_developer_id);
CREATE INDEX IF NOT EXISTS ix_apis_project ON apis(project_id);

-- ===== API Configs (key-value pairs per API) =====
CREATE TABLE IF NOT EXISTS api_configs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id     uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      text NOT NULL,
  is_secret  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_api_config_key UNIQUE (api_id, key)
);

CREATE INDEX IF NOT EXISTS ix_api_configs_api ON api_configs(api_id);

-- ===== UI Schemas (JSON structure definitions per API) =====
CREATE TABLE IF NOT EXISTS ui_schemas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id      uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  name        text NOT NULL,
  schema_json jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ui_schemas_api ON ui_schemas(api_id);

-- ===== Generated Codes (source code files produced by AI) =====
CREATE TABLE IF NOT EXISTS generated_codes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id                uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  generation_session_id uuid NULL REFERENCES generation_sessions(id) ON DELETE SET NULL,
  file_path             text NOT NULL,
  content               text NOT NULL,
  language              text NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_generated_codes_api ON generated_codes(api_id);
CREATE INDEX IF NOT EXISTS ix_generated_codes_session ON generated_codes(generation_session_id);

-- ===== Deployments (deployment records per API) =====
CREATE TABLE IF NOT EXISTS deployments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id        uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  environment   deployment_environment NOT NULL DEFAULT 'DEVELOPMENT',
  status        deployment_status NOT NULL DEFAULT 'PENDING',
  provider      text NULL,
  metadata_json jsonb NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_deployments_api ON deployments(api_id);
CREATE INDEX IF NOT EXISTS ix_deployments_status ON deployments(status);
