export interface Deployment {
  deployment_id: string;
  code_id: string;
  repo_url: string | null;
  branch: string;
  status: "pending" | "success" | "failed";
  deployed_at: Date | null;
  created_at: Date;
}
