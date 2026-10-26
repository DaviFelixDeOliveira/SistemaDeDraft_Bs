import type { GuestJoinSession } from '../services/draftAutoGuestService';

/** UI-only guard: the server remains the authority for approvals and room expiry. */
export function isDraftGuestTokenExpired(expiresAt: string, now = Date.now()): boolean {
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}

export function restoreDraftGuestSession(
  stored: string | null, code: string, now = Date.now(),
): GuestJoinSession | null {
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Partial<GuestJoinSession>;
    if (data.code !== code || typeof data.requestId !== 'string' || !data.requestId ||
        typeof data.token !== 'string' || !data.token || typeof data.expiresAt !== 'string' ||
        !['pending', 'approved', 'rejected', 'expired'].includes(String(data.status))) {
      return null;
    }
    const session = data as GuestJoinSession;
    return isDraftGuestTokenExpired(session.expiresAt, now)
      ? { ...session, status: 'expired' }
      : session;
  } catch {
    return null;
  }
}
