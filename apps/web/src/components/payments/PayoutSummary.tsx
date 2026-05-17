import * as React from "react";
import { Landmark, Calendar } from "lucide-react";
import { Card } from "@famm/ui";

export interface PayoutSummaryProps {
  externalAccountLast4: string | null;
  schedule: {
    interval: "daily" | "weekly" | "monthly" | "manual";
    delayDays: number;
  } | null;
}

const INTERVAL_LABEL: Record<"daily" | "weekly" | "monthly" | "manual", string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  manual: "Manual",
};

export function PayoutSummary({ externalAccountLast4, schedule }: PayoutSummaryProps) {
  if (!externalAccountLast4 && !schedule) return null;
  return (
    <Card className="flex flex-col gap-stack-sm p-inset-md">
      <h3 className="text-sm font-semibold text-text-primary">Payouts</h3>
      <dl className="flex flex-col gap-stack-xs text-sm">
        {externalAccountLast4 ? (
          <Row icon={Landmark} label="Bank">
            Account ending ••{externalAccountLast4}
          </Row>
        ) : null}
        {schedule ? (
          <Row icon={Calendar} label="Schedule">
            {INTERVAL_LABEL[schedule.interval]}
            {schedule.delayDays > 0 ? `, ${schedule.delayDays} business day hold` : ""}
          </Row>
        ) : null}
      </dl>
    </Card>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-inline-sm">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-text-secondary"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <dt className="text-xs text-text-muted">{label}</dt>
        <dd className="text-sm text-text-primary">{children}</dd>
      </div>
    </div>
  );
}
