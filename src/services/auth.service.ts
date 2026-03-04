import { AuthRepository } from "../repositories/auth.repository";
import { prisma } from "../clients/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { sha256 } from "../utils/tokenHash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { ConflictError, UnauthorizedError } from "../middlewares/errorHandler";
import type {
  OAuthProfile,
  AuthRegisterResponse,
  AuthLoginResponse,
  AuthTokensResponse,
} from "../dtos";

function computeRefreshExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

export class AuthService {
  static async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<AuthRegisterResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    const existed = await AuthRepository.findDeveloperByEmail(normalizedEmail);
    if (existed) throw ConflictError("EMAIL_ALREADY_USED");

    const password_hash = await hashPassword(password);
    const dev = await AuthRepository.createDeveloper({
      email: normalizedEmail,
      password_hash,
      display_name: displayName ?? null,
    });

    const tokens = await this.issueTokens(dev.id);
    return {
      user: {
        id: dev.id,
        email: dev.email,
        displayName: dev.display_name,
        avatarUrl: dev.avatar_url,
      },
      tokens,
    };
  }

  static async login(
    emailOrUsername: string,
    password: string,
  ): Promise<AuthLoginResponse> {
    const normalizedInput = emailOrUsername.toLowerCase().trim();

    const dev = await AuthRepository.findDeveloperByEmail(normalizedInput);

    if (!dev || !dev.password_hash)
      throw UnauthorizedError("INVALID_CREDENTIALS");

    const ok = await verifyPassword(password, dev.password_hash);
    if (!ok) throw UnauthorizedError("INVALID_CREDENTIALS");

    const tokens = await this.issueTokens(dev.id);
    return {
      user: {
        id: dev.id,
        email: dev.email,
        displayName: dev.display_name,
        avatarUrl: dev.avatar_url,
      },
      tokens,
    };
  }

  static async loginOAuth(payload: OAuthProfile): Promise<AuthLoginResponse> {
    const linked = await AuthRepository.findOAuthAccount(
      payload.provider,
      payload.providerUserId,
    );
    if (linked) {
      const dev = await AuthRepository.findDeveloperById(linked.developer_id);
      const tokens = await this.issueTokens(linked.developer_id);
      return {
        user: {
          id: linked.developer_id,
          email: dev?.email ?? null,
          displayName: dev?.display_name ?? null,
          avatarUrl: dev?.avatar_url ?? null,
        },
        tokens,
      };
    }

    // Normalize email if present
    const normalizedEmail = payload.email?.toLowerCase().trim() ?? null;

    // link by email if exists
    let dev = normalizedEmail
      ? await AuthRepository.findDeveloperByEmail(normalizedEmail)
      : null;

    // create dev without password (OAuth-only)
    if (!dev) {
      // create with random password_hash to satisfy NOT NULL? (trong schema bạn để NULL ok)
      dev = await AuthRepository.createDeveloper({
        email:
          normalizedEmail ??
          `${payload.providerUserId}@${payload.provider.toLowerCase()}.oauth.local`,
        password_hash: await hashPassword(cryptoRandom()),
        display_name: payload.displayName ?? null,
      });
    } else {
      await AuthRepository.updateDeveloperProfile(dev.id, {
        display_name: payload.displayName ?? dev.display_name,
        avatar_url: payload.avatarUrl ?? dev.avatar_url,
      });
    }

    await AuthRepository.createOAuthAccount(
      dev.id,
      payload.provider,
      payload.providerUserId,
      normalizedEmail,
    );

    const tokens = await this.issueTokens(dev.id);
    return {
      user: {
        id: dev.id,
        email: dev.email,
        displayName: dev.display_name,
        avatarUrl: dev.avatar_url,
      },
      tokens,
    };
  }

  static async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenId = decoded.jti;

    const record = await AuthRepository.findRefreshTokenById(tokenId);
    if (!record) throw UnauthorizedError("REFRESH_NOT_FOUND");
    if (record.revoked_at) throw UnauthorizedError("REFRESH_REVOKED");
    if (record.expires_at.getTime() < Date.now())
      throw UnauthorizedError("REFRESH_EXPIRED");

    const inputHash = sha256(refreshToken);
    if (inputHash !== record.token_hash)
      throw UnauthorizedError("REFRESH_INVALID");

    await AuthRepository.revokeRefreshToken(record.id);
    return this.issueTokens(decoded.sub);
  }

  static async logout(refreshToken: string): Promise<void> {
    const decoded = verifyRefreshToken(refreshToken);
    const record = await AuthRepository.findRefreshTokenById(decoded.jti);
    if (record && !record.revoked_at)
      await AuthRepository.revokeRefreshToken(record.id);
  }

  static async issueTokens(developerId: string): Promise<AuthTokensResponse> {
    const accessToken = signAccessToken(developerId);

    // create refresh token record first
    const expiresAt = computeRefreshExpiry();
    const record = await AuthRepository.createRefreshTokenRecord(
      developerId,
      `PENDING_${cryptoRandom()}`,
      expiresAt,
    );

    const refreshToken = signRefreshToken(developerId, record.id);
    const token_hash = sha256(refreshToken);

    // update hash (2-step vì cần record.id làm jti)
    await prisma.refresh_tokens.update({
      where: { id: record.id },
      data: { token_hash },
    });

    return { accessToken, refreshToken };
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
