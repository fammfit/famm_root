import { getRequestContext } from "@/lib/request-context";
import { getOrCreateProgress } from "@/lib/onboarding/mock-progress";
import { OnboardingShell } from "@/components/layouts/OnboardingShell";

export const dynamic = "force-dynamic";

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  const ctx = getRequestContext();
  const progress = getOrCreateProgress(ctx.tenantId, ctx.userId);
  const canRestart = ctx.userRole === "TENANT_OWNER" || ctx.userRole === "SUPER_ADMIN";
  return (
    <OnboardingShell initialProgress={progress} canRestart={canRestart}>
      {children}
    </OnboardingShell>
  );
}
