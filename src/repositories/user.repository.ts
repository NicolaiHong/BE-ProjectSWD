import pool from "../config/database";
import { User, UserRegisterDTO } from "../models/user.model";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [
      email,
    ]);
    return result.rows[0] || null;
  }

  async findById(userId: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM "user" WHERE user_id = $1', [
      userId,
    ]);
    return result.rows[0] || null;
  }

  async create(userData: UserRegisterDTO): Promise<User> {
    const { name, email, password } = userData;
    const result = await pool.query(
      `INSERT INTO "user" (name, email, password_hash) 
       VALUES ($1, $2, crypt($3, gen_salt('bf')))
       RETURNING user_id, name, email, role, created_at`,
      [name, email, password],
    );
    return result.rows[0];
  }

  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE "user" 
       SET password_hash = crypt($1, gen_salt('bf'))
       WHERE email = $2`,
      [newPassword, email],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT user_id, name, email, role, created_at 
       FROM "user" 
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, password],
    );
    return result.rows[0] || null;
  }
}
