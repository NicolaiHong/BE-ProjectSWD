-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- User table 
CREATE TABLE "user" (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- AI IDEA TO CODE WORKFLOW


-- Idea table
CREATE TABLE idea (
  idea_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Request
CREATE TABLE ai_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES idea(idea_id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Response
CREATE TABLE ai_response (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES ai_request(request_id) ON DELETE CASCADE,
  response_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UI Schema
CREATE TABLE ui_schema (
  schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES ai_response(response_id) ON DELETE CASCADE,
  schema_description TEXT,
  schema_json JSONB,
  version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated UI
CREATE TABLE generated_ui (
  ui_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID REFERENCES ui_schema(schema_id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
  preview_description TEXT,
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Code
CREATE TABLE generated_code (
  code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_id UUID REFERENCES generated_ui(ui_id) ON DELETE CASCADE,
  html_code TEXT,
  css_code TEXT,
  js_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_idea_user ON idea(user_id);
CREATE INDEX idx_idea_status ON idea(status);
CREATE INDEX idx_ai_request_idea ON ai_request(idea_id);
CREATE INDEX idx_ai_response_request ON ai_response(request_id);
CREATE INDEX idx_ui_schema_response ON ui_schema(response_id);
CREATE INDEX idx_generated_ui_schema ON generated_ui(schema_id);
CREATE INDEX idx_generated_ui_user ON generated_ui(user_id);
CREATE INDEX idx_generated_code_ui ON generated_code(ui_id);



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
