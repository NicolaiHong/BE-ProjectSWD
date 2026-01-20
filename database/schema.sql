-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE "user" (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- IDEA TO CODE WORKFLOW
-- ============================================

-- Bảng Idea
CREATE TABLE idea (
  idea_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  raw_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Project Specification
CREATE TABLE project_spec (
  spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES idea(idea_id) ON DELETE CASCADE,
  requirements_text TEXT, 
  technical_stack JSONB, 
  milestones JSONB, 
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Prompt Template
CREATE TABLE prompt_template (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  template_content TEXT NOT NULL,
  category VARCHAR(100), 
  variables JSONB, 
  version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng AI Request
CREATE TABLE ai_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  idea_id UUID REFERENCES idea(idea_id) ON DELETE CASCADE,
  template_id UUID REFERENCES prompt_template(template_id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INT,
  request_type VARCHAR(50), 
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng AI Response
CREATE TABLE ai_response (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ai_request(request_id) ON DELETE CASCADE,
  response_content TEXT NOT NULL,
  tokens_used INT,
  processing_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng UI Schema
CREATE TABLE ui_schema (
  schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES ai_response(response_id) ON DELETE CASCADE,
  spec_id UUID REFERENCES project_spec(spec_id) ON DELETE SET NULL,
  schema_description TEXT,
  schema_json JSONB, 
  design_system VARCHAR(100), -- 
  version INT DEFAULT 1,
  parent_schema_id UUID REFERENCES ui_schema(schema_id) ON DELETE SET NULL, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Generated Code:
CREATE TABLE generated_code (
  code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES ui_'material', 'tailwind', 'custom'schema(schema_id) ON DELETE CASCADE,
  framework VARCHAR(100), 
  html_code TEXT,
  css_code TEXT,
  js_code TEXT,
  dependencies JSONB, 
  build_status VARCHAR(50) DEFAULT 'draft', 
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Code Deployment
CREATE TABLE code_deployment (
  deployment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES generated_code(code_id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  preview_url TEXT,
  production_url TEXT,
  deployment_status VARCHAR(50) DEFAULT 'pending', 
  deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng User Feedback 
CREATE TABLE user_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  code_id UUID REFERENCES generated_code(code_id) ON DELETE SET NULL,
  schema_id UUID REFERENCES ui_schema(schema_id) ON DELETE SET NULL,
  feedback_text TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_idea_user ON idea(user_id);
CREATE INDEX idx_idea_status ON idea(status);
CREATE INDEX idx_project_spec_idea ON project_spec(idea_id);
CREATE INDEX idx_prompt_template_category ON prompt_template(category);
CREATE INDEX idx_ai_request_user ON ai_request(user_id);
CREATE INDEX idx_ai_request_idea ON ai_request(idea_id);
CREATE INDEX idx_ai_request_type ON ai_request(request_type);
CREATE INDEX idx_ai_response_request ON ai_response(request_id);
CREATE INDEX idx_ui_schema_response ON ui_schema(response_id);
CREATE INDEX idx_ui_schema_parent ON ui_schema(parent_schema_id);
CREATE INDEX idx_generated_code_schema ON generated_code(schema_id);
CREATE INDEX idx_code_deployment_code ON code_deployment(code_id);
CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_idea_updated_at
  BEFORE UPDATE ON idea
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

