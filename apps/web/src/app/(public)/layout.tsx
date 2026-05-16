/**
 * Public route group layout — pass-through. The PublicShell is mounted
 * per-page so we can pass the resolved signed-in role from the server
 * component without dragging an extra context provider into every leaf.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
