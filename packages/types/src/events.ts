export type DomainEventType =
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "booking.rescheduled"
  | "booking.no_show"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.refunded"
  | "user.created"
  | "user.invited"
  | "user.deactivated"
  | "tenant.created"
  | "tenant.suspended"
  | "tenant.plan_changed"
  | "service.created"
  | "service.updated"
  | "availability.updated"
  | "ai.conversation.started"
  | "ai.conversation.ended"
  | "ai.action.executed";

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  tenantId: string;
  type: DomainEventType;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  occurredAt: string;
}

export interface EventEnvelope<T = Record<string, unknown>> {
  event: DomainEvent<T>;
  publishedAt: string;
  retryCount: number;
}
