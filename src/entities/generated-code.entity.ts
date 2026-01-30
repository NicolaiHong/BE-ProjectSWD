export interface GeneratedCode {
  code_id: string;
  schema_id: string;
  frontend_code: string | null;
  backend_code: string | null;
  config_files: any | null;
  created_at: Date;
}
