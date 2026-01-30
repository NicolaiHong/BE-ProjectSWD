export interface ApiConfig {
  config_id: string;
  api_id: string;
  auth_required: boolean;
  pagination: boolean;
  searchable: boolean;
  columns: any | null;
  filters: any | null;
  created_at: Date;
}
