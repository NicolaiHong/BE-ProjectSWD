import pool from "../config/database";
import { ApiConfigRow } from "../types/ApiConfigRow";
import { ApiRow } from "../types/ApiRow";
export class GeneratorRepository {
  //get list of all APIs
  async listApis(): Promise<ApiRow[]> {
    const { rows } = await pool.query<ApiRow>(
      `SELECT api_id, name, method, endpoint, description FROM api ORDER BY created_at DESC`,
    );
    return rows;
  }
}
