import { Pool } from "pg";
import { config } from "./constants";

export const pool = new Pool(config.database);

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  process.exit(-1);
});

export default pool;
