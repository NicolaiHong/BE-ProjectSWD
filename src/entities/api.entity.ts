export interface Api {
  api_id: string;
  name: string;
  method: string;
  endpoint: string;
  description: string | null;
  created_at: Date;
}
