import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantSlug: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  timezone: z.string().optional().default("UTC"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  tenant: z.string().min(1),
});

export const SmsOtpRequestSchema = z.object({
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^\+?[1-9]\d{6,19}$/, "Invalid phone number format"),
  tenantSlug: z.string().min(1).max(63),
});

export const SmsOtpVerifySchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits"),
  tenantSlug: z.string().min(1).max(63),
});

export const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "CLIENT",
    "STAFF",
    "TRAINER",
    "TRAINER_LEAD",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]),
  message: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(128).optional(),
  timezone: z.string().optional().default("UTC"),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum([
    "CLIENT",
    "STAFF",
    "TRAINER",
    "TRAINER_LEAD",
    "TENANT_ADMIN",
  ]), // TENANT_OWNER can only be transferred, not assigned
  permissions: z.array(z.string()).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>;
export type MagicLinkVerifyInput = z.infer<typeof MagicLinkVerifySchema>;
export type SmsOtpRequestInput = z.infer<typeof SmsOtpRequestSchema>;
export type SmsOtpVerifyInput = z.infer<typeof SmsOtpVerifySchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
