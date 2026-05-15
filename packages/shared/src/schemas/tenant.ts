import { z } from "zod";

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().email(),
  ownerFirstName: z.string().min(1).max(100),
  ownerLastName: z.string().min(1).max(100),
  ownerPassword: z.string().min(8).max(128),
  timezone: z.string().optional().default("UTC"),
  currency: z.string().length(3).optional().default("USD"),
});

export const UpdateTenantSettingsSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().optional(),
  bookingLeadTimeMinutes: z.number().int().min(0).optional(),
  bookingWindowDays: z.number().int().min(1).max(365).optional(),
  cancellationWindowHours: z.number().int().min(0).optional(),
  maxConcurrentBookings: z.number().int().min(1).optional(),
  requirePaymentUpfront: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  aiPersonaName: z.string().max(50).optional(),
  aiSystemPrompt: z.string().max(2000).optional(),
});

export const UpdateTenantBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().max(100).optional(),
  customDomain: z.string().optional(),
  customCss: z.string().max(10000).optional(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantSettingsInput = z.infer<typeof UpdateTenantSettingsSchema>;
export type UpdateTenantBrandingInput = z.infer<typeof UpdateTenantBrandingSchema>;
