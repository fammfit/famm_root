export type SocialPlatform = "instagram" | "tiktok" | "youtube";

const HOSTS: Record<SocialPlatform, string> = {
  instagram: "instagram.com",
  tiktok: "tiktok.com",
  youtube: "youtube.com",
};

const URL_RE = /^https?:\/\/[^\s]+$/i;
const HANDLE_RE = /^@?[\w.]+$/;

/**
 * Normalize a user-entered social value to a canonical URL.
 *
 * Accepts:
 *   "@maya"               -> "https://instagram.com/maya"
 *   "maya.r.fitness"      -> "https://instagram.com/maya.r.fitness"
 *   "instagram.com/maya"  -> "https://instagram.com/maya"
 *   "https://instagram.com/maya?utm=foo" -> "https://instagram.com/maya"
 *
 * Returns `null` for empty input.
 * Throws `InvalidSocialInputError` if the value looks like neither.
 */
export class InvalidSocialInputError extends Error {
  readonly platform: SocialPlatform;
  constructor(platform: SocialPlatform, message: string) {
    super(message);
    this.platform = platform;
    this.name = "InvalidSocialInputError";
  }
}

export function normalizeHandle(platform: SocialPlatform, raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const host = HOSTS[platform];

  if (URL_RE.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const path = u.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      // YouTube channels can be /@handle, /c/name, /channel/UC..., or /user/...
      // Preserve the path as-is for YouTube; for others, take the first segment.
      if (platform === "youtube") {
        return `https://${host}/${path}`;
      }
      const handle = path.split("/")[0] ?? "";
      if (!handle) {
        throw new InvalidSocialInputError(platform, "Missing handle");
      }
      return `https://${host}/${stripAt(handle)}`;
    } catch {
      throw new InvalidSocialInputError(platform, "Invalid URL");
    }
  }

  // Bare handle path: foo / @foo / instagram.com/foo.
  const m = /^(?:(?:https?:\/\/)?(?:www\.)?[a-z]+\.com\/)?@?([\w./-]+)$/i.exec(trimmed);
  if (!m || !m[1]) {
    throw new InvalidSocialInputError(platform, "Use a handle or full URL");
  }
  const handle = m[1].replace(/^\/+/, "").replace(/\/+$/, "");
  if (!HANDLE_RE.test(stripAt(handle).split("/")[0] ?? "")) {
    throw new InvalidSocialInputError(platform, "Handle has invalid characters");
  }
  return `https://${host}/${stripAt(handle)}`;
}

export function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // Be strict about the website field — it represents a real homepage,
  // not a social handle. Reject @handles and accept only http(s) URLs.
  if (trimmed.startsWith("@")) {
    throw new InvalidSocialInputError(
      "instagram",
      "Use a full URL for the website, e.g. https://example.com"
    );
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (!u.hostname.includes(".")) {
      throw new InvalidSocialInputError(
        "instagram",
        "Use a full URL for the website, e.g. https://example.com"
      );
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    throw new InvalidSocialInputError(
      "instagram",
      "Use a full URL for the website, e.g. https://example.com"
    );
  }
}

function stripAt(s: string): string {
  return s.startsWith("@") ? s.slice(1) : s;
}
