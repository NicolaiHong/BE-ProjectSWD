import { prisma } from "../clients/prisma";

export class AuthRepository {
  // Developers
  static findDeveloperByEmail(email: string) {
    return prisma.developers.findFirst({ where: { email } });
  }

  static findDeveloperById(id: string) {
    return prisma.developers.findUnique({ where: { id } });
  }

  static createDeveloper(data: {
    email: string;
    password_hash: string;
    display_name?: string | null;
  }) {
    return prisma.developers.create({ data: { ...data, avatar_url: null } });
  }

  static updateDeveloperProfile(
    id: string,
    data: { display_name?: string | null; avatar_url?: string | null },
  ) {
    return prisma.developers.update({ where: { id }, data });
  }

  // OAuth accounts
  static findOAuthAccount(
    provider: "GOOGLE" | "GITHUB",
    providerUserId: string,
  ) {
    return prisma.oauth_accounts.findFirst({
      where: { provider, provider_user_id: providerUserId },
    });
  }

  static createOAuthAccount(
    devId: string,
    provider: "GOOGLE" | "GITHUB",
    providerUserId: string,
    email?: string | null,
  ) {
    return prisma.oauth_accounts.create({
      data: {
        developer_id: devId,
        provider,
        provider_user_id: providerUserId,
        email: email ?? null,
      },
    });
  }

  // Refresh tokens
  static createRefreshTokenRecord(
    developerId: string,
    token_hash: string,
    expires_at: Date,
  ) {
    return prisma.refresh_tokens.create({
      data: { developer_id: developerId, token_hash, expires_at },
    });
  }

  static findRefreshTokenById(id: string) {
    return prisma.refresh_tokens.findUnique({ where: { id } });
  }

  static revokeRefreshToken(id: string) {
    return prisma.refresh_tokens.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
  }
}
