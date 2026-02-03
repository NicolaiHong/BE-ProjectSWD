export interface OAuthProfile {
  provider: "GOOGLE" | "GITHUB";
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}
