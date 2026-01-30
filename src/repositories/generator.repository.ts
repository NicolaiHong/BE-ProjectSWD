import { config } from "./../config/constants";
import pool from "../config/database";
import {
  ApiConfigRow,
  ApiRow,
  CreateApiDTO,
  CreateApiConfigDTO,
} from "../dtos";

export class GeneratorRepository {
  //get list of all APIs
  async listApis(): Promise<ApiRow[]> {
    const { rows } = await pool.query<ApiRow>(
      `SELECT api_id, name, method, endpoint, description FROM api ORDER BY created_at DESC`,
    );
    return rows;
  }

  // Create new API
  async createApi(data: CreateApiDTO): Promise<ApiRow> {
    const { rows } = await pool.query<ApiRow>(
      `INSERT INTO api (name, method, endpoint, description)
       VALUES ($1, $2, $3, $4)
       RETURNING api_id, name, method, endpoint, description, created_at`,
      [
        data.name,
        data.method.toUpperCase(),
        data.endpoint,
        data.description ?? null,
      ],
    );
    return rows[0];
  }

  // Get API by ID
  async getApiById(api_id: string): Promise<ApiRow | null> {
    const { rows, rowCount } = await pool.query<ApiRow>(
      `SELECT api_id, name, method, endpoint, description, created_at FROM api WHERE api_id = $1`,
      [api_id],
    );
    return rowCount ? rows[0] : null;
  }

  // Update API
  async updateApi(
    api_id: string,
    data: Partial<CreateApiDTO>,
  ): Promise<ApiRow | null> {
    const { rows, rowCount } = await pool.query<ApiRow>(
      `UPDATE api SET 
        name = COALESCE($2, name),
        method = COALESCE($3, method),
        endpoint = COALESCE($4, endpoint),
        description = COALESCE($5, description)
       WHERE api_id = $1
       RETURNING api_id, name, method, endpoint, description, created_at`,
      [
        api_id,
        data.name,
        data.method?.toUpperCase(),
        data.endpoint,
        data.description,
      ],
    );
    return rowCount ? rows[0] : null;
  }

  // Delete API
  async deleteApi(api_id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM api WHERE api_id = $1`, [
      api_id,
    ]);
    return rowCount !== null && rowCount > 0;
  }

  // Create API Config
  async createApiConfig(data: CreateApiConfigDTO): Promise<ApiConfigRow> {
    const { rows } = await pool.query<ApiConfigRow>(
      `INSERT INTO api_config (api_id, auth_required, pagination, searchable, columns, filters)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING config_id, api_id, auth_required, pagination, searchable, columns, filters, created_at`,
      [
        data.api_id,
        data.auth_required ?? false,
        data.pagination ?? true,
        data.searchable ?? true,
        data.columns ? JSON.stringify(data.columns) : null,
        data.filters ? JSON.stringify(data.filters) : null,
      ],
    );
    return rows[0];
  }

  // Get API Config by API ID
  async getApiConfigByApiId(api_id: string): Promise<ApiConfigRow | null> {
    const { rows, rowCount } = await pool.query<ApiConfigRow>(
      `SELECT config_id, api_id, auth_required, pagination, searchable, columns, filters, created_at 
       FROM api_config WHERE api_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [api_id],
    );
    return rowCount ? rows[0] : null;
  }

  // Update API Config
  async updateApiConfig(
    config_id: string,
    data: Partial<CreateApiConfigDTO>,
  ): Promise<ApiConfigRow | null> {
    const { rows, rowCount } = await pool.query<ApiConfigRow>(
      `UPDATE api_config SET 
        auth_required = COALESCE($2, auth_required),
        pagination = COALESCE($3, pagination),
        searchable = COALESCE($4, searchable),
        columns = COALESCE($5, columns),
        filters = COALESCE($6, filters)
       WHERE config_id = $1
       RETURNING config_id, api_id, auth_required, pagination, searchable, columns, filters, created_at`,
      [
        config_id,
        data.auth_required,
        data.pagination,
        data.searchable,
        data.columns ? JSON.stringify(data.columns) : undefined,
        data.filters ? JSON.stringify(data.filters) : undefined,
      ],
    );
    return rowCount ? rows[0] : null;
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
    const configRes = await pool.query<ApiConfigRow>(
      `SELECT config_id, api_id, auth_required, pagination, searchable, columns, filters FROM api_config WHERE api_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [api_id],
    );
    return { api: apiRes.rows[0], config: configRes.rows[0] };
  }
  //insert new UI generation schema
  async insertUISchema(
    config_id: string,
    schema_json: any,
    description?: string,
  ) {
    const res = await pool.query(
      `INSERT INTO ui_schema (config_id, schema_json, description)
       VALUES ($1, $2, $3)
       RETURNING schema_id, config_id, schema_json, description, created_at`,
      [config_id, JSON.stringify(schema_json), description ?? null],
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

  // List all UI Schemas
  async listUISchemas() {
    const { rows } = await pool.query(
      `SELECT s.schema_id, s.config_id, s.schema_json, s.description, s.created_at,
              a.name as api_name, a.method, a.endpoint
       FROM ui_schema s
       JOIN api_config c ON s.config_id = c.config_id
       JOIN api a ON c.api_id = a.api_id
       ORDER BY s.created_at DESC`,
    );
    return rows;
  }

  // Delete UI Schema
  async deleteUISchema(schema_id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM ui_schema WHERE schema_id = $1`,
      [schema_id],
    );
    return rowCount !== null && rowCount > 0;
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
      [
        schema_id,
        frontend_code,
        config_files ? JSON.stringify(config_files) : null,
      ],
    );
    return rows[0];
  }

  // Get Generated Code by ID
  async getGeneratedCodeById(code_id: string) {
    const { rows, rowCount } = await pool.query(
      `SELECT c.code_id, c.schema_id, c.frontend_code, c.config_files, c.created_at,
              s.schema_json, a.name as api_name, a.method, a.endpoint
       FROM generated_code c
       JOIN ui_schema s ON c.schema_id = s.schema_id
       JOIN api_config cfg ON s.config_id = cfg.config_id
       JOIN api a ON cfg.api_id = a.api_id
       WHERE c.code_id = $1`,
      [code_id],
    );
    if (rowCount === 0) throw new Error("Generated code not found");
    return rows[0];
  }

  // List all Generated Codes
  async listGeneratedCodes() {
    const { rows } = await pool.query(
      `SELECT c.code_id, c.schema_id, c.config_files, c.created_at,
              a.name as api_name, a.method, a.endpoint
       FROM generated_code c
       JOIN ui_schema s ON c.schema_id = s.schema_id
       JOIN api_config cfg ON s.config_id = cfg.config_id
       JOIN api a ON cfg.api_id = a.api_id
       ORDER BY c.created_at DESC`,
    );
    return rows;
  }

  // Delete Generated Code
  async deleteGeneratedCode(code_id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM generated_code WHERE code_id = $1`,
      [code_id],
    );
    return rowCount !== null && rowCount > 0;
  }

  // Get generation history (API -> Config -> Schema -> Code)
  async getGenerationHistory() {
    const { rows } = await pool.query(
      `SELECT 
        a.api_id, a.name as api_name, a.method, a.endpoint,
        cfg.config_id,
        s.schema_id, s.description as schema_description, s.created_at as schema_created_at,
        c.code_id, c.config_files, c.created_at as code_created_at
       FROM api a
       LEFT JOIN api_config cfg ON a.api_id = cfg.api_id
       LEFT JOIN ui_schema s ON cfg.config_id = s.config_id
       LEFT JOIN generated_code c ON s.schema_id = c.schema_id
       ORDER BY COALESCE(c.created_at, s.created_at, cfg.created_at, a.created_at) DESC`,
    );
    return rows;
  }
}
