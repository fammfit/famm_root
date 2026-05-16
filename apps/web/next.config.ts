import type { NextConfig } from "next";

const cdnHost = process.env["NEXT_PUBLIC_CDN_HOST"];
const s3Bucket = process.env["NEXT_PUBLIC_S3_BUCKET"];

const cspConnectSrc = [
  "'self'",
  process.env["NEXT_PUBLIC_API_URL"] ?? "",
  // WebSockets - allow same-host wss + the configured API host.
  "wss:",
].filter(Boolean);

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required by Next.js inline runtime; 'unsafe-eval'
      // is omitted. Tighten further with a nonce-based CSP once Next.js
      // supports it cleanly in this codebase.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${cspConnectSrc.join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@famm/shared", "@famm/db"],
  images: {
    // Restrict to explicitly-configured hosts. The previous `**.amazonaws.com`
    // wildcard allowed any S3 bucket (including attacker-controlled ones) to
    // be proxied through next/image.
    remotePatterns: [
      ...(s3Bucket
        ? ([{ protocol: "https" as const, hostname: `${s3Bucket}.s3.amazonaws.com` }] as const)
        : []),
      ...(cdnHost ? ([{ protocol: "https" as const, hostname: cdnHost }] as const) : []),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
