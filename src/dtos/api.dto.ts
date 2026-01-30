export interface CreateApiRequestDTO {
  name: string;
  method: string;
  endpoint: string;
  description?: string;
}

export type CreateApiDTO = CreateApiRequestDTO;

export interface UpdateApiRequestDTO {
  name?: string;
  method?: string;
  endpoint?: string;
  description?: string;
}

export interface CreateApiConfigRequestDTO {
  api_id: string;
  auth_required?: boolean;
  pagination?: boolean;
  searchable?: boolean;
  columns?: ColumnConfig[];
  filters?: FilterConfig[];
}

export type CreateApiConfigDTO = CreateApiConfigRequestDTO;

export interface UpdateApiConfigRequestDTO {
  auth_required?: boolean;
  pagination?: boolean;
  searchable?: boolean;
  columns?: ColumnConfig[];
  filters?: FilterConfig[];
}

export interface ColumnConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "image";
}

export interface FilterConfig {
  key: string;
  label: string;
  type?: "text" | "select" | "date";
}

export interface ApiResponseDTO {
  api_id: string;
  name: string;
  method: string;
  endpoint: string;
  description: string | null;
  created_at?: Date;
}

export type ApiRow = ApiResponseDTO;

export interface ApiConfigResponseDTO {
  config_id: string;
  api_id: string;
  auth_required: boolean;
  pagination: boolean;
  searchable: boolean;
  columns: ColumnConfig[] | null;
  filters: FilterConfig[] | null;
  created_at?: Date;
}

export type ApiConfigRow = ApiConfigResponseDTO;

export interface ApiWithConfigResponseDTO {
  api: ApiResponseDTO;
  config: ApiConfigResponseDTO | null;
}
