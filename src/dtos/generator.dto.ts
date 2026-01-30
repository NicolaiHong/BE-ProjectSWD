export interface GenerateUISchemaRequestDTO {
  api_id: string;
}

export interface GenerateCodeRequestDTO {
  schema_id: string;
  framework?: FrameworkKey;
}

export interface GenerateFullRequestDTO {
  api_id?: string;
  api?: {
    name: string;
    method: string;
    endpoint: string;
    description?: string;
  };
  config?: {
    auth_required?: boolean;
    pagination?: boolean;
    searchable?: boolean;
    columns?: any[];
    filters?: any[];
  };
  framework?: FrameworkKey;
}

export type FrameworkKey = "react" | "angular" | "vue" | "php" | "nextjs";

export interface FrameworkConfig {
  name: string;
  extension: string;
  promptHint: string;
  defaultPath: (pageName: string) => string;
}

export interface FrameworkResponseDTO {
  key: string;
  name: string;
  extension: string;
}

export interface UISchemaResponseDTO {
  schema_id: string;
  config_id: string;
  schema_json: UISchemaJSON;
  description: string | null;
  created_at: Date;
  api_name?: string;
  method?: string;
  endpoint?: string;
}

export interface UISchemaJSON {
  pageName: string;
  pageTitle: string;
  table: {
    columns: { key: string; label: string; type: string }[];
    pagination: boolean;
    searchable: boolean;
    searchPlaceholder: string;
  };
  form: {
    fields: { key: string; label: string; type: string; required: boolean }[];
    submitLabel: string;
  };
  filters: {
    fields: { key: string; label: string; type: string }[];
  };
  api: {
    list: string;
    create: string;
    update: string;
    delete: string;
  };
}

export interface GeneratedCodeResponseDTO {
  code_id: string;
  schema_id: string;
  frontend_code: string;
  config_files: CodeConfigFiles;
  created_at: Date;
  suggested_path?: string;
  api_name?: string;
  method?: string;
  endpoint?: string;
}

export interface CodeConfigFiles {
  suggestedPath: string;
  framework: FrameworkKey;
  frameworkName: string;
  extension: string;
}

export interface GeneratedCodeListItemDTO {
  code_id: string;
  schema_id: string;
  config_files: CodeConfigFiles;
  created_at: Date;
  api_name: string;
  method: string;
  endpoint: string;
}

export interface GenerateFullResponseDTO {
  api_id: string;
  config_id: string;
  schema_id: string;
  code_id: string;
  frontend_code: string;
  suggested_path: string;
  framework: FrameworkKey;
}

export interface GenerationHistoryItemDTO {
  api_id: string;
  api_name: string;
  method: string;
  endpoint: string;
  config_id: string | null;
  schema_id: string | null;
  schema_description: string | null;
  schema_created_at: Date | null;
  code_id: string | null;
  config_files: CodeConfigFiles | null;
  code_created_at: Date | null;
}
