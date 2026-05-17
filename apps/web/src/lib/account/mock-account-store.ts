import type {
  ActiveSession,
  BookingDefaults,
  MemberRole,
  MfaMethod,
  NotificationPrefs,
  SecuritySnapshot,
  TaxSettings,
  Teammate,
  TransferTicket,
} from "./types";

/**
 * In-memory mock store for all account/settings slices. Keyed by tenantId
 * so each tenant has its own state. Replaces real Prisma writes until
 * the settings model lands.
 */

interface TenantAccountState {
  security: SecuritySnapshot;
  sessions: ActiveSession[];
  team: Teammate[];
  bookingDefaults: BookingDefaults;
  tax: TaxSettings;
  notifications: NotificationPrefs;
  transferTickets: Map<string, { targetUserId: string; expiresAt: number }>;
  closedAt: string | null;
}

const STORE = new Map<string, TenantAccountState>();

function defaultNotifications(): NotificationPrefs {
  return {
    "booking.confirmed": { email: true, sms: false },
    "booking.reminder.24h": { email: true, sms: true },
    "booking.reminder.1h": { email: false, sms: true },
    "booking.cancelled": { email: true, sms: false },
    "payment.succeeded": { email: true, sms: false },
    "payment.failed": { email: true, sms: true },
  };
}

function seed(tenantId: string, ownerUserId: string, ownerEmail: string): TenantAccountState {
  const now = new Date().toISOString();
  return {
    security: {
      mfaMethod: "none",
      passwordUpdatedAt: now,
      hasPassword: true,
    },
    sessions: [
      {
        id: `sess_${tenantId.slice(0, 8)}_current`,
        deviceName: "This device",
        ipAddress: null,
        lastSeenAt: now,
        isCurrent: true,
      },
    ],
    team: [
      {
        id: ownerUserId,
        email: ownerEmail,
        firstName: "Owner",
        lastName: "",
        role: "TENANT_OWNER",
        status: "active",
        invitedAt: now,
        joinedAt: now,
      },
    ],
    bookingDefaults: {
      minLeadTimeMinutes: 60,
      cancellationWindowHours: 24,
      autoConfirm: true,
      noShowFee: {
        enabled: false,
        amountMinor: 2500,
        currency: "USD",
      },
    },
    tax: {
      inclusive: false,
      defaultRateBps: 0,
      invoiceFromName: "",
      invoiceFromAddress: "",
    },
    notifications: defaultNotifications(),
    transferTickets: new Map(),
    closedAt: null,
  };
}

function get(tenantId: string, ownerUserId: string, ownerEmail: string): TenantAccountState {
  let s = STORE.get(tenantId);
  if (!s) {
    s = seed(tenantId, ownerUserId, ownerEmail);
    STORE.set(tenantId, s);
  }
  return s;
}

export function getSecurity(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): SecuritySnapshot {
  return get(tenantId, ownerUserId, ownerEmail).security;
}

export function updateSecurity(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  patch: Partial<{ mfaMethod: MfaMethod; passwordUpdatedAt: string }>
): SecuritySnapshot {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.security = { ...s.security, ...patch };
  return s.security;
}

export function listSessions(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): ActiveSession[] {
  return get(tenantId, ownerUserId, ownerEmail).sessions;
}

export function revokeOtherSessions(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): ActiveSession[] {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.sessions = s.sessions.filter((sess) => sess.isCurrent);
  return s.sessions;
}

export function listTeam(tenantId: string, ownerUserId: string, ownerEmail: string): Teammate[] {
  return get(tenantId, ownerUserId, ownerEmail).team;
}

export function inviteTeammate(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  input: { email: string; firstName: string; lastName: string; role: MemberRole }
): Teammate {
  const s = get(tenantId, ownerUserId, ownerEmail);
  const now = new Date().toISOString();
  const teammate: Teammate = {
    id: `usr_${Math.random().toString(36).slice(2, 10)}`,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    status: "invited",
    invitedAt: now,
    joinedAt: null,
  };
  s.team.push(teammate);
  return teammate;
}

export function updateTeammateRole(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  memberId: string,
  role: MemberRole
): Teammate | null {
  const s = get(tenantId, ownerUserId, ownerEmail);
  const t = s.team.find((m) => m.id === memberId);
  if (!t) return null;
  t.role = role;
  return t;
}

export function removeTeammate(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  memberId: string
): boolean {
  const s = get(tenantId, ownerUserId, ownerEmail);
  const before = s.team.length;
  s.team = s.team.filter((m) => m.id !== memberId);
  return s.team.length < before;
}

export function getBookingDefaults(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): BookingDefaults {
  return get(tenantId, ownerUserId, ownerEmail).bookingDefaults;
}

export function updateBookingDefaults(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  patch: Partial<BookingDefaults>
): BookingDefaults {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.bookingDefaults = { ...s.bookingDefaults, ...patch };
  return s.bookingDefaults;
}

export function getTax(tenantId: string, ownerUserId: string, ownerEmail: string): TaxSettings {
  return get(tenantId, ownerUserId, ownerEmail).tax;
}

export function updateTax(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  patch: Partial<TaxSettings>
): TaxSettings {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.tax = { ...s.tax, ...patch };
  return s.tax;
}

export function getNotifications(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): NotificationPrefs {
  return get(tenantId, ownerUserId, ownerEmail).notifications;
}

export function updateNotifications(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  prefs: NotificationPrefs
): NotificationPrefs {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.notifications = prefs;
  return s.notifications;
}

export function createTransferTicket(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  targetUserId: string
): TransferTicket {
  const s = get(tenantId, ownerUserId, ownerEmail);
  const ticketId = `tt_${Math.random().toString(36).slice(2, 10)}`;
  s.transferTickets.set(ticketId, {
    targetUserId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return { ticketId, smsHint: "Sent a code to your phone ending ••••" };
}

/** Stub: accepts any 6-digit string. Returns the new owner row or null. */
export function confirmTransfer(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string,
  ticketId: string,
  code: string
): { newOwnerId: string } | null {
  if (!/^\d{6}$/.test(code)) return null;
  const s = get(tenantId, ownerUserId, ownerEmail);
  const ticket = s.transferTickets.get(ticketId);
  if (!ticket || ticket.expiresAt < Date.now()) return null;

  // Swap roles: previous owner becomes admin, target becomes owner.
  s.team = s.team.map((m) => {
    if (m.id === ownerUserId) return { ...m, role: "TENANT_ADMIN" };
    if (m.id === ticket.targetUserId) return { ...m, role: "TENANT_OWNER" };
    return m;
  });
  s.transferTickets.delete(ticketId);
  return { newOwnerId: ticket.targetUserId };
}

export function closeAccount(
  tenantId: string,
  ownerUserId: string,
  ownerEmail: string
): { closedAt: string } {
  const s = get(tenantId, ownerUserId, ownerEmail);
  s.closedAt = new Date().toISOString();
  return { closedAt: s.closedAt };
}
