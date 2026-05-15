// Domain-specific errors for the payments subsystem.

export class PaymentsError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "PaymentsError";
  }
}

export class WebhookSignatureError extends PaymentsError {
  constructor(cause?: unknown) {
    super("Invalid Stripe webhook signature", "WEBHOOK_SIGNATURE_INVALID", cause);
    this.name = "WebhookSignatureError";
  }
}

export class WebhookReplayError extends PaymentsError {
  constructor(eventId: string) {
    super(`Webhook event already processed: ${eventId}`, "WEBHOOK_REPLAY");
    this.name = "WebhookReplayError";
  }
}

export class SplitConfigurationError extends PaymentsError {
  constructor(message: string) {
    super(message, "SPLIT_CONFIG_INVALID");
    this.name = "SplitConfigurationError";
  }
}

export class LedgerImbalanceError extends PaymentsError {
  constructor(transactionId: string, debits: bigint, credits: bigint) {
    super(
      `Ledger transaction ${transactionId} is imbalanced: debits=${debits} credits=${credits}`,
      "LEDGER_IMBALANCE"
    );
    this.name = "LedgerImbalanceError";
  }
}

export class RefundExceedsPaymentError extends PaymentsError {
  constructor(paymentId: string, requested: number, available: number) {
    super(
      `Refund of ${requested} exceeds refundable amount ${available} on payment ${paymentId}`,
      "REFUND_EXCEEDS_PAYMENT"
    );
    this.name = "RefundExceedsPaymentError";
  }
}

export class ConnectAccountNotReadyError extends PaymentsError {
  constructor(accountId: string) {
    super(`Connected account ${accountId} is not onboarded for payouts`, "CONNECT_NOT_READY");
    this.name = "ConnectAccountNotReadyError";
  }
}
