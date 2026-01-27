export type ApiConfigRow = {
  config_id: string;
  api_id: string;
  auth_required: boolean;
  pagination: boolean;
  searchable: boolean;
  columns: any;
  filters: any;
};
