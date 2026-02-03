import { z } from "zod";

export const AuthRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type AuthRefreshRequest = z.infer<typeof AuthRefreshRequestSchema>;
