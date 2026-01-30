export interface RegisterRequestDTO {
  name: string;
  email: string;
  password: string;
}

export type UserRegisterDTO = RegisterRequestDTO;

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export type UserLoginDTO = LoginRequestDTO;

export interface RefreshTokenRequestDTO {
  refresh_token: string;
}

export type RefreshTokenDTO = RefreshTokenRequestDTO;

export interface ForgotPasswordRequestDTO {
  email: string;
}

export type ForgotPasswordDTO = ForgotPasswordRequestDTO;

export interface VerifyOTPRequestDTO {
  email: string;
  otp: string;
}

export type VerifyOTPDTO = VerifyOTPRequestDTO;

export interface ResetPasswordRequestDTO {
  email: string;
  newPassword: string;
}

export type UserResetPasswordDTO = ResetPasswordRequestDTO;

export interface ResetPasswordWithOTPRequestDTO {
  email: string;
  otp: string;
  newPassword: string;
}

export type ResetPasswordWithOTPDTO = ResetPasswordWithOTPRequestDTO;

export interface UserResponseDTO {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponseDTO {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponseDTO;
}

export type AuthResponse = AuthResponseDTO;

export interface MessageResponseDTO {
  message: string;
}

export interface OTPVerifyResponseDTO {
  valid: boolean;
  message: string;
}
