export interface User {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}

export type UserPublic = Omit<User, "password_hash">;
