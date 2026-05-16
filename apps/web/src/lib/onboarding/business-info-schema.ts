import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const E164 = /^\+?[1-9]\d{6,19}$/;
const TIME_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const OperatingHourEntrySchema = z
  .object({
    dayOfWeek: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    open: z.string().regex(TIME_HHMM, "Use HH:MM"),
    close: z.string().regex(TIME_HHMM, "Use HH:MM"),
  })
  .refine((v) => v.open < v.close, {
    message: "Closing time must be after opening time",
    path: ["close"],
  });

export const BusinessInfoSchema = z
  .object({
    name: z.string().trim().min(1, "Public business name is required").max(120),
    legalName: z.string().trim().max(200).nullable(),
    country: z.string().length(2, "Pick a country"),
    currency: z.string().length(3, "Pick a currency"),
    locale: z.string().min(2).max(15),
    timezone: z.string().min(1, "Pick a timezone"),
    addressLine1: z.string().trim().min(1, "Address is required").max(200),
    addressLine2: z.string().trim().max(200).nullable(),
    addressCity: z.string().trim().min(1, "City is required").max(120),
    addressRegion: z.string().trim().min(1, "Required").max(120),
    addressPostalCode: z.string().trim().max(20),
    businessPhone: z
      .union([z.string().regex(E164, "Use international format, e.g. +15555550140"), z.literal("")])
      .nullable(),
    businessEmail: z.union([z.string().email("Use a valid email"), z.literal("")]).nullable(),
    taxIdentifier: z.string().trim().max(64).nullable(),
    businessCategory: z.string().trim().max(64).nullable(),
    operatingHours: z
      .array(OperatingHourEntrySchema)
      .refine((arr) => arr.length > 0, { message: "Pick at least one day you're open" }),
    logoUrl: z.string().url().nullable(),
    primaryColor: z.string().regex(HEX_COLOR, "Use a 6-digit hex color"),
  })
  .superRefine((v, ctx) => {
    // Country/postal soft check: ZIP-like rule for US, etc. Lives at the
    // form layer because the country table holds the regex.
    void v;
    void ctx;
  });

export type BusinessInfoInput = z.infer<typeof BusinessInfoSchema>;
