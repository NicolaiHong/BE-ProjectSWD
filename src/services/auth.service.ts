import { AuthRepository } from "../repositories/auth.repository";
import { hashPassword, verifyPassword } from "../utils/password";
import { sha256 } from "../utils/tokenHash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

function computeRefreshExpiry() {
  // match JWT_REFRESH_TTL: cho 30 days
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

export class AuthService {
  static async register(email: string, password: string, displayName?: string) {
    const existed = await AuthRepository.findDeveloperByEmail(email);
    if (existed) throw new Error("EMAIL_ALREADY_USED");

    const password_hash = await hashPassword(password);
    const dev = await AuthRepository.createDeveloper({
      email,
      password_hash,
      display_name: displayName ?? null,
    });

    return this.issueTokens(dev.id);
  }

  static async login(email: string, password: string) {
    const dev = await AuthRepository.findDeveloperByEmail(email);
    if (!dev || !dev.password_hash) throw new Error("INVALID_CREDENTIALS");

    const ok = await verifyPassword(password, dev.password_hash);
    if (!ok) throw new Error("INVALID_CREDENTIALS");

    return this.issueTokens(dev.id);
  }

  static async loginOAuth(payload: {
    provider: "GOOGLE" | "GITHUB";
    providerUserId: string;
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  }) {
    const linked = await AuthRepository.findOAuthAccount(
      payload.provider,
      payload.providerUserId,
    );
    if (linked) return this.issueTokens(linked.developer_id);

    // link by email if exists
    let dev = payload.email
      ? await AuthRepository.findDeveloperByEmail(payload.email)
      : null;

    // create dev without password (OAuth-only)
    if (!dev) {
      // create with random password_hash to satisfy NOT NULL? (trong schema bạn để NULL ok)
      dev = await AuthRepository.createDeveloper({
        email:
          payload.email ??
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
      payload.email ?? null,
    );
    return this.issueTokens(dev.id);
  }

  static async refresh(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenId = decoded.jti;

    const record = await AuthRepository.findRefreshTokenById(tokenId);
    if (!record) throw new Error("REFRESH_NOT_FOUND");
    if (record.revoked_at) throw new Error("REFRESH_REVOKED");
    if (record.expires_at.getTime() < Date.now())
      throw new Error("REFRESH_EXPIRED");

    // verify hash matches
    const inputHash = sha256(refreshToken);
    if (inputHash !== record.token_hash) throw new Error("REFRESH_INVALID");

    // rotate: revoke old and issue new
    await AuthRepository.revokeRefreshToken(record.id);
    return this.issueTokens(decoded.sub);
  }

  static async logout(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);
    const record = await AuthRepository.findRefreshTokenById(decoded.jti);
    if (record && !record.revoked_at)
      await AuthRepository.revokeRefreshToken(record.id);
  }

  static async issueTokens(developerId: string) {
    const accessToken = signAccessToken(developerId);

    // create refresh token record first
    const expiresAt = computeRefreshExpiry();
    const record = await AuthRepository.createRefreshTokenRecord(
      developerId,
      "PENDING",
      expiresAt,
    );

    const refreshToken = signRefreshToken(developerId, record.id);
    const token_hash = sha256(refreshToken);

    // update hash (2-step vì cần record.id làm jti)
    await (
      await import("../clients/prisma")
    ).prisma.refresh_tokens.update({
      where: { id: record.id },
      data: { token_hash },
    });

    return { accessToken, refreshToken };
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
