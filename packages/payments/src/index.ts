export { getStripeClient } from "./client";

export * from "./config";
export * from "./errors";
export * from "./money";
export * from "./pricing";
export * from "./commission";
export * from "./ledger";
export * from "./checkout";
export * from "./subscriptions";
export * from "./refunds";
export * from "./payouts";
export * from "./retry";
export * from "./analytics";

export {
  createConnectAccount,
  createAccountLink,
  createDashboardLoginLink,
  getConnectAccountStatus,
  syncTrainerConnectStatus,
  createPaymentIntent,
} from "./connect";
export type { ConnectAccountStatus } from "./connect";

export {
  constructWebhookEvent,
  WebhookRouter,
  buildDefaultRouter,
  resolveSplitRule,
} from "./webhooks";
export type { StripeEventType } from "./webhooks";
