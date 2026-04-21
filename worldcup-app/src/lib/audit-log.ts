import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Append an immutable entry to the audit log.
 *
 * Rules of thumb:
 * - Log every admin action (state-changing).
 * - Log every security-relevant event (login success, password change,
 *   password reset initiation/consumption, session invalidation, etc.)
 * - Do NOT log read actions, navigation, or normal bracket picks — too noisy.
 * - Payload is `text` (JSON stringified). Keep it small — just the bits that
 *   matter for forensics. Never log passwords, tokens, or hash material.
 *
 * Failures in this function should never crash the caller. If the audit
 * insert fails we swallow and `console.error` — the business action
 * already happened and rolling it back for audit failure would be worse.
 */
export async function logAudit(entry: {
  actorUserId: number | null;
  actorUsername: string | null;
  action: string;
  payload?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId,
      actorUsername: entry.actorUsername,
      action: entry.action,
      payload: entry.payload === undefined ? null : JSON.stringify(entry.payload),
    });
  } catch (err) {
    console.error("audit_log insert failed:", err);
  }
}
