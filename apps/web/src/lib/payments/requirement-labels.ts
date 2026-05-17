/**
 * Map Stripe Connect requirement field paths to friendly English labels.
 *
 * Stripe's `Account.requirements.currently_due` is a flat list of strings
 * like "individual.verification.document". The full taxonomy is long;
 * this map covers the most-common Express paths. Unknown fields fall
 * back to a generic label so the UI never blanks.
 */

const LABELS: Record<string, string> = {
  "individual.verification.document": "Verify your identity",
  "individual.verification.additional_document": "Upload an additional ID document",
  "individual.email": "Confirm your email",
  "individual.phone": "Confirm your phone number",
  "individual.dob.day": "Confirm your date of birth",
  "individual.dob.month": "Confirm your date of birth",
  "individual.dob.year": "Confirm your date of birth",
  "individual.first_name": "Add your legal first name",
  "individual.last_name": "Add your legal last name",
  "individual.address.line1": "Add your home address",
  "individual.ssn_last_4": "Confirm your SSN (last 4)",
  "individual.id_number": "Add your tax ID",
  external_account: "Add a bank account",
  "external_account.routing_number": "Add a bank account",
  "external_account.account_number": "Add a bank account",
  "tos_acceptance.date": "Accept Stripe's terms",
  "tos_acceptance.ip": "Accept Stripe's terms",
  "business_profile.url": "Add your business URL",
  "business_profile.product_description": "Describe what you sell",
  "business_profile.mcc": "Choose your business category",
};

const GENERIC_FALLBACK = "More info on Stripe";

export function labelForRequirement(field: string): string {
  return LABELS[field] ?? GENERIC_FALLBACK;
}

/**
 * Some Stripe fields differ by surface (`document` vs `document_back`).
 * Collapse duplicates that resolve to the same label so the UI doesn't
 * show "Verify your identity" twice in a row.
 */
export function dedupeRequirementLabels<T extends { label: string }>(reqs: ReadonlyArray<T>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of reqs) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    out.push(r);
  }
  return out;
}
