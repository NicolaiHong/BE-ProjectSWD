-- ============================================
-- SIMPLE AI ADMIN GENERATOR - FINAL SCHEMA
-- Scope: Use AI API (NO training)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- RESET DATABASE
-- ============================================
DROP TABLE IF EXISTS deployment CASCADE;
DROP TABLE IF EXISTS generated_code CASCADE;
DROP TABLE IF EXISTS ui_schema CASCADE;
DROP TABLE IF EXISTS api_config CASCADE;
DROP TABLE IF EXISTS api CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- ============================================
-- USER (ADMIN LOGIN)
-- ============================================
CREATE TABLE "user" (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- API (CHỌN API ĐỂ SINH GIAO DIỆN)
-- ============================================
CREATE TABLE api (
  api_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,        -- VD: Product API
  method VARCHAR(10) NOT NULL,       -- GET, POST, PUT, DELETE
  endpoint TEXT NOT NULL,            -- /api/products
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- API CONFIG (CẤU HÌNH SINH UI)
-- ============================================
CREATE TABLE api_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES api(api_id) ON DELETE CASCADE,

  auth_required BOOLEAN DEFAULT FALSE,
  pagination BOOLEAN DEFAULT TRUE,
  searchable BOOLEAN DEFAULT TRUE,

  columns JSONB,                     -- field hiển thị
  filters JSONB,                     -- field filter

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- UI SCHEMA (GIAO DIỆN QUẢN LÝ DO AI SINH)
-- ============================================
CREATE TABLE ui_schema (
  schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES api_config(config_id) ON DELETE CASCADE,

  schema_json JSONB NOT NULL,         -- layout, form, table
  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GENERATED CODE (CODE SINH RA)
-- ============================================
CREATE TABLE generated_code (
  code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID NOT NULL REFERENCES ui_schema(schema_id) ON DELETE CASCADE,

  frontend_code TEXT,                 -- React / Vue
  backend_code TEXT,                  -- optional
  config_files JSONB,                 -- package.json, env

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DEPLOYMENT (PUSH GIT / DEPLOY)
-- ============================================
CREATE TABLE deployment (
  deployment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES generated_code(code_id) ON DELETE CASCADE,

  repo_url TEXT,                      -- GitHub repo
  branch VARCHAR(100) DEFAULT 'main',
  status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed

  deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_api_method ON api(method);
CREATE INDEX idx_api_config_api ON api_config(api_id);
CREATE INDEX idx_ui_schema_config ON ui_schema(config_id);
CREATE INDEX idx_generated_code_schema ON generated_code(schema_id);
CREATE INDEX idx_deployment_code ON deployment(code_id);

-- ============================================
-- SAMPLE ADMIN ACCOUNT
-- ============================================
INSERT INTO "user" (name, email, password_hash)
VALUES (
  'Admin',
  'admin@example.com',
  crypt('admin123', gen_salt('bf'))
);
