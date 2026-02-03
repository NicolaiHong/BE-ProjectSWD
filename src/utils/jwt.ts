import jwt, { type SignOptions } from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("Missing JWT secrets in env");
}

// sau đoạn này, TS đôi khi vẫn kẹt → ép kiểu rõ ràng:
const ACCESS_SECRET: string = accessSecret;
const REFRESH_SECRET: string = refreshSecret;

const accessTtl = process.env.JWT_ACCESS_TTL ?? "15m";
const refreshTtl = process.env.JWT_REFRESH_TTL ?? "30d";

const accessOptions: SignOptions = { expiresIn: accessTtl as SignOptions["expiresIn"] };
const refreshOptions: SignOptions = { expiresIn: refreshTtl as SignOptions["expiresIn"] };

export function signAccessToken(developerId: string) {
  return jwt.sign({ sub: developerId }, ACCESS_SECRET, accessOptions);
}

export function signRefreshToken(developerId: string, tokenId: string) {
  // jti = refresh token record id
  return jwt.sign({ sub: developerId, jti: tokenId }, REFRESH_SECRET, refreshOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as { sub: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string; jti: string };
}
