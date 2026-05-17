import { z } from "zod";

export const TrainerInfoSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,19}$/, "Please include your country code, e.g. +1 555 555 1234"),
  timezone: z.string().min(1, "Pick a timezone"),
  avatarUrl: z.string().url().nullable(),
});

export type TrainerInfoInput = z.infer<typeof TrainerInfoSchema>;

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Too long")
      .regex(/[A-Za-z]/, "Must include a letter")
      .regex(/\d/, "Must include a digit"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;
