import { z } from "zod";

const normalizedEmail = z
  .string()
  .email("Invalid email format")
  .transform((v) => v.toLowerCase().trim());

const password = z.string().min(8, "Password must be at least 8 characters");

export const AuthRegisterRequestSchema = z.object({
  email: normalizedEmail,
  password: password,
  displayName: z.string().min(1).max(100).optional(),
});

export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;
