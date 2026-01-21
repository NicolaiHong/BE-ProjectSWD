export interface User {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}

export interface UserRegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserResetPasswordDTO {
  email: string;
  newPassword: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    user_id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface RefreshTokenDTO {
  refresh_token: string;
}
