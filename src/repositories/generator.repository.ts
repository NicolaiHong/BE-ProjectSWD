import { config } from "./../config/constants";
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
  //get API and new config by api id
  async getApiAndConfig(
    api_id: string,
  ): Promise<{ api: ApiRow; config: ApiConfigRow }> {
    const apiRes = await pool.query<ApiRow>(
      `SELECT api_id, name, method, endpoint, description FROM api WHERE api_id = $1`,
      [api_id],
    );
    if (apiRes.rowCount === 0) throw new Error("API not found");
    const configRes = await pool.query(
      `SELECT config_id, api_id, auth_required, pagination, searchable, columns, filters FROM api_config WHERE api_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [api_id],
    );
    return { api: apiRes.rows[0], config: configRes.rows[0] };
  }
  //inert new UI generation schema
  async insertUISchema(
    config_id: string,
    schema_json: any,
    description?: string,
  ) {
    const res = await pool.query(
      `INSERT INTO ui_schema (config_id, schema_json, description)
       VALUES ($1, $2, $3)
       RETURNING schema_id, config_id, schema_json, description, created_at`,
      [config_id, schema_json, description ?? null],
    );
    return res.rows[0];
  }
  //get UI schema by schema id
  async getUISchemaById(schema_id: string) {
    const { rows, rowCount } = await pool.query(
      `SELECT schema_id,config_id,schema_json,description,created_at FROM ui_schema WHERE schema_id = $1`,
      [schema_id],
    );
    if (rowCount === 0) throw new Error("UI Schema not found");
    return rows[0];
  }
  //insert generated code into database
  async insertGeneratedCode(
    schema_id: string,
    frontend_code: string,
    config_files: any,
  ) {
    const { rows } = await pool.query(
      `INSERT INTO generated_code (schema_id, frontend_code, config_files)
    VALUES ($1, $2, $3)
    RETURNING code_id, schema_id, frontend_code, config_files, created_at`,
      [schema_id, frontend_code, config_files],
    );
    return rows[0];
  }
}
