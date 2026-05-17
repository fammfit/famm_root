import { z } from "zod";

export const SLUG_REGEX = /^[a-z][a-z0-9-]{2,29}$/;

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_REGEX, "Use 3–30 lowercase letters, digits, or dashes")
  .refine((s) => !/--/.test(s), "No consecutive dashes")
  .refine((s) => !s.endsWith("-"), "Cannot end with a dash");

export const PublicProfileSchema = z.object({
  slug: SlugSchema,
  headline: z.string().trim().min(1, "Headline is required").max(80),
  bioMd: z.string().trim().min(1, "Tell clients about yourself").max(500),
  specialties: z
    .array(z.string().trim().min(1).max(32))
    .min(1, "Pick at least one specialty")
    .max(6, "Up to 6 specialties"),
  gallery: z.array(z.string().url()).max(6, "Up to 6 photos"),
  socialInstagram: z.string().url().nullable(),
  socialTiktok: z.string().url().nullable(),
  socialYoutube: z.string().url().nullable(),
  socialWebsite: z.string().url().nullable(),
});

export type PublicProfileInput = z.infer<typeof PublicProfileSchema>;

export function suggestSlug(name: string, fallbackId: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  if (SLUG_REGEX.test(base)) return base;
  return `tenant-${fallbackId.slice(0, 6)}`;
}
