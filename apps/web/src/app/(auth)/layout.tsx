/**
 * Auth route group. Pages own their own AuthShell (title varies by page),
 * so this layout is intentionally a pass-through. We keep the group for
 * symmetry with (trainer) and (client) and to anchor a shared error
 * boundary if we add one later.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
