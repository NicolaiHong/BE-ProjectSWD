import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../config/constants";
import { UserRepository } from "../repositories/user.repository";
import {
  UserRegisterDTO,
  UserLoginDTO,
  UserResetPasswordDTO,
  AuthResponse,
  RefreshTokenDTO,
} from "../models/user.model";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async register(data: UserRegisterDTO): Promise<AuthResponse> {
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const user = await this.userRepo.create(data);
    return this.generateAuthResponse(
      user.user_id,
      user.email,
      user.role,
      user.name,
    );
  }

  async login(data: UserLoginDTO): Promise<AuthResponse> {
    const user = await this.userRepo.verifyPassword(data.email, data.password);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    return this.generateAuthResponse(
      user.user_id,
      user.email,
      user.role,
      user.name,
    );
  }

  async refreshToken(data: RefreshTokenDTO): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        data.refresh_token,
        config.jwt.refreshSecret,
      ) as JwtPayload & TokenPayload;

      // Check user still exists
      const user = await this.userRepo.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate new tokens
      return this.generateAuthResponse(
        user.user_id,
        user.email,
        user.role,
        user.name,
      );
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  async resetPassword(data: UserResetPasswordDTO): Promise<void> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new Error("User not found");
    }

    const updated = await this.userRepo.updatePassword(
      data.email,
      data.newPassword,
    );
    if (!updated) {
      throw new Error("Failed to reset password");
    }
  }

  private generateAuthResponse(
    userId: string,
    email: string,
    role: string,
    name: string,
  ): AuthResponse {
    const payload: TokenPayload = { userId, email, role };

    const access_token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiresIn,
    });

    const refresh_token = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiresIn,
    });

    // Calculate expires_in in seconds
    const expiresIn = this.parseExpiration(config.jwt.accessTokenExpiresIn);

    return {
      access_token,
      refresh_token,
      token_type: "Bearer",
      expires_in: expiresIn,
      user: {
        user_id: userId,
        name,
        email,
        role,
      },
    };
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "userId" in decoded
      ) {
        return decoded as JwtPayload & TokenPayload;
      }

      throw new Error("Invalid token payload");
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }
}
