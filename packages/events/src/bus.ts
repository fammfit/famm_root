import { connect, type NatsConnection, StringCodec, type Subscription } from "nats";
import type { DomainEvent, DomainEventType } from "@famm/types";

let _nc: NatsConnection | null = null;
const sc = StringCodec();

export async function getNatsConnection(): Promise<NatsConnection> {
  if (!_nc || _nc.isClosed()) {
    _nc = await connect({
      servers: process.env["NATS_URL"] ?? "nats://localhost:4222",
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
    });
    console.warn("[events] Connected to NATS:", _nc.getServer());
  }
  return _nc;
}

export async function publish<T = Record<string, unknown>>(
  event: DomainEvent<T>
): Promise<void> {
  const nc = await getNatsConnection();
  const subject = `famm.${event.tenantId}.${event.type}`;
  nc.publish(subject, sc.encode(JSON.stringify(event)));
}

export async function subscribe<T = Record<string, unknown>>(
  tenantId: string,
  eventType: DomainEventType | "*",
  handler: (event: DomainEvent<T>) => Promise<void>
): Promise<Subscription> {
  const nc = await getNatsConnection();
  const subject = `famm.${tenantId}.${eventType}`;
  const sub = nc.subscribe(subject);

  void (async () => {
    for await (const msg of sub) {
      try {
        const event = JSON.parse(sc.decode(msg.data)) as DomainEvent<T>;
        await handler(event);
      } catch (err) {
        console.error("[events] Handler error:", err);
      }
    }
  })();

  return sub;
}

export async function closeConnection(): Promise<void> {
  if (_nc && !_nc.isClosed()) {
    await _nc.close();
    _nc = null;
  }
}
