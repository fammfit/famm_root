import { type NextRequest } from "next/server";
import { rotateRefreshToken } from "@/lib/auth/session";
import { issueTokenBundle } from "@/lib/auth/tokens";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";
import { RefreshTokenSchema } from "@famm/shared";

export async function POST(request: NextRequest) {
  try {
    const rawRefreshToken =
      (await request.json().catch(() => null) as { refreshToken?: string } | null)?.refreshToken
      ?? request.cookies.get("refresh_token")?.value;

    if (!rawRefreshToken) {
      return apiError("UNAUTHORIZED", "Missing refresh token", 401);
    }

    // Validate schema
    RefreshTokenSchema.parse({ refreshToken: rawRefreshToken });

    const { accessToken, refreshToken: newRefreshToken, refreshTokenHash } =
      await issueTokenBundle({
        sub: "placeholder",
        email: "placeholder",
        tenantId: null,
        role: "CLIENT",
        sid: "placeholder",
      });

    const session = await rotateRefreshToken(rawRefreshToken, refreshTokenHash);
    if (!session) {
      return apiError("UNAUTHORIZED", "Invalid or expired refresh token", 401);
    }

    const { accessToken: finalToken } = await issueTokenBundle({
      sub: session.userId,
      email: session.email,
      tenantId: session.tenantId,
      role: session.role,
      sid: session.sessionId,
    });

    return apiSuccess({
      accessToken: finalToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    return handleError(err);
  }
}
