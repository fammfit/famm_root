/**
 * POST /api/v1/uploads/logo
 *
 * STUB. Accepts multipart with a single `file` field, validates type/size,
 * and returns a data: URL so the UI can keep working end-to-end while the
 * real S3 wiring is built. Larger max edge than avatar (1024 vs 512) so
 * logos retain enough resolution for receipts and the public booking page.
 *
 * TODO(uploads): swap the data-URL response for a presigned S3 URL +
 * persisted asset record.
 */
import { type NextRequest } from "next/server";
import { getAuthContext } from "@/lib/rbac/access-control";
import { apiSuccess, apiError, handleError } from "@/lib/api-response";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    getAuthContext(request); // throws if missing — auth required

    const form = await request.formData().catch(() => null);
    if (!form) {
      return apiError("BAD_REQUEST", "Expected multipart/form-data", 400);
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("BAD_REQUEST", "Missing 'file' field", 400);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("UNSUPPORTED_MEDIA_TYPE", "Use JPEG, PNG, or WebP", 415);
    }
    if (file.size > MAX_BYTES) {
      return apiError("PAYLOAD_TOO_LARGE", "Logo is over 5 MB", 413);
    }

    const buf = await file.arrayBuffer();
    const base64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(buf).toString("base64")
        : btoa(String.fromCharCode(...new Uint8Array(buf)));
    const dataUrl = `data:${file.type};base64,${base64}`;

    return apiSuccess({ url: dataUrl });
  } catch (err) {
    return handleError(err);
  }
}
