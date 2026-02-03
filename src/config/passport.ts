import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
  VerifyCallback as GoogleVerifyCallback,
} from "passport-google-oauth20";
import {
  Strategy as GithubStrategy,
  Profile as GithubProfile,
} from "passport-github2";
import type { VerifyCallback as GithubVerifyCallback } from "passport-oauth2";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    (
      _a: string,
      _r: string,
      profile: GoogleProfile,
      done: GoogleVerifyCallback,
    ) => {
      done(null, {
        provider: "GOOGLE",
        providerUserId: profile.id,
        email: profile.emails?.[0]?.value ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.photos?.[0]?.value ?? null,
      });
    },
  ),
);

passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ["user:email"],
    },
    (
      _a: string,
      _r: string,
      profile: GithubProfile,
      done: GithubVerifyCallback,
    ) => {
      done(null, {
        provider: "GITHUB",
        providerUserId: profile.id,
        email: profile.emails?.[0]?.value ?? null,
        displayName: profile.displayName ?? profile.username ?? null,
        avatarUrl: profile.photos?.[0]?.value ?? null,
      });
    },
  ),
);

export { passport };
