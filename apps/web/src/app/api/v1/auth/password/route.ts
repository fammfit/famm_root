/**
 * POST /api/v1/auth/password
 *
 * Set or change the current user's password.
 *   - If the user already has a passwordHash, `currentPassword` is required.
 *   - bcrypt-hashes `newPassword` and persists. Returns { ok: true }.
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/rbac/access-control";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { apiSuccess, apiError, handleError, zodErrorsToDetails } from "@/lib/api-response";

const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .max(72)
      .regex(/[A-Za-z]/, "Must include a letter")
      .regex(/\d/, "Must include a digit"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const ctx = getAuthContext(request);
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = PasswordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid password",
        422,
        zodErrorsToDetails(parsed.error)
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, passwordHash: true, email: true, firstName: true, lastName: true },
    });
    if (!user) return apiError("NOT_FOUND", "User not found", 404);

    // Cheap dictionary check: refuse trivially-personal passwords.
    const lower = newPassword.toLowerCase();
    const personal = [
      user.firstName?.toLowerCase(),
      user.lastName?.toLowerCase(),
      user.email.split("@")[0]?.toLowerCase(),
    ].filter(Boolean) as string[];
    if (personal.some((p) => p.length >= 4 && lower.includes(p))) {
      return apiError(
        "WEAK_PASSWORD",
        "Pick a password that doesn't include your name or email",
        422
      );
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return apiError(
          "CURRENT_PASSWORD_REQUIRED",
          "Enter your current password to change it",
          400
        );
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        return apiError("INVALID_PASSWORD", "Current password is incorrect", 401);
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return apiSuccess({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
