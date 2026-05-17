/**
 * @page Onboarding Step 7 — Import Contacts
 *   (/trainer/onboarding/trainer-onboarding-flow/import-contacts)
 *
 * Purpose: optional client roster bootstrap. Trainer can drop a CSV,
 *   add a few clients by hand, or skip and bring people in later from
 *   the Clients tab. We dedupe within the batch and against the (stub)
 *   tenant contact list, validate every row, and let the trainer toggle
 *   "send invites" before committing.
 * Primary user: TENANT_OWNER (write); TENANT_ADMIN read-only in real
 *   model — the onboarding gate already restricts who lands here.
 * Core actions: Pick CSV / map columns / fix rows / exclude rows /
 *   manual quick-add / send invites toggle / Import / Skip.
 * UI sections: source picker (CSV vs manual), CsvDropzone,
 *   ColumnMappingForm, ContactReviewTable (with per-row inline edits +
 *   exclude), ManualQuickAdd, send-invites toggle, ImportResultsSummary
 *   when the call succeeds.
 * Empty state: review table shows EmptyState until a CSV is mapped or a
 *   manual row is added.
 * Loading state: mutation spinner on the Continue (re-labelled "Import").
 * Error state: inline parser error on bad CSV; per-row error chips;
 *   API error renders the standard return banner.
 * Mobile layout: single column; the shell's sticky footer carries Back /
 *   Skip / Import. Import is disabled until at least one row is valid.
 * Required data: client-side parsed rows only. Mutation hits
 *   POST /api/v1/contacts/import (stub) and GET /dedupe for known
 *   emails/phones.
 * Related components: CsvDropzone, ColumnMappingForm, ContactReviewTable,
 *   ManualQuickAdd, ImportResultsSummary.
 * Route: /trainer/onboarding/trainer-onboarding-flow/import-contacts
 *   (trainer-only — gated by the (onboarding) route group).
 */

import { OnboardingStepBody } from "@/components/onboarding/OnboardingStepBody";
import { getStep } from "@/lib/onboarding/steps";
import { ImportContactsStep } from "./import-contacts-step";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bring your clients — FAMM",
};

export default function ImportContactsPage() {
  const step = getStep("import-contacts");
  return (
    <OnboardingStepBody>
      <header className="flex flex-col gap-stack-xs">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Step {step.index} of 7
        </p>
        <h1 tabIndex={-1} className="text-2xl font-semibold text-text-primary md:text-3xl">
          {step.title}
        </h1>
      </header>
      <ImportContactsStep />
    </OnboardingStepBody>
  );
}
