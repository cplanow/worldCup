import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SessionData {
  userId?: number;
  username?: string;
  // Snapshot of users.session_version at the time this session was issued.
  // If the user's DB row has a higher version later (e.g. after a password
  // change), this session is stale and getSessionUser treats it as invalid —
  // other devices get force-logged-out on the next request.
  sessionVersion?: number;
}

// Minimum 32 chars — iron-session uses this as an AES-256 key.
// Rotate periodically; rotation invalidates all existing sessions.
function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters. " +
        "Generate one with: openssl rand -base64 48"
    );
  }
  return {
    password,
    cookieName: "worldcup_session",
    cookieOptions: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, getSessionOptions());
}

function adminUsername(): string | null {
  const name = process.env.ADMIN_USERNAME?.toLowerCase().trim();
  return name || null;
}

export function isAdminUsername(username: string | undefined | null): boolean {
  const admin = adminUsername();
  return !!admin && !!username && username.toLowerCase() === admin;
}

/**
 * Resolve the authenticated user from the session cookie. Returns the DB row.
 * Returns null if the session is missing/invalid or the user no longer exists.
 * Does NOT redirect — callers decide whether to redirect or return an error.
 */
export async function getSessionUser() {
  const session = await getSession();
  if (!session.userId || !session.username) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  // Invalidate if: user is gone, username changed, or session was issued
  // against an older session_version (M3 — password change / forced logout).
  if (!user) return null;
  if (user.username !== session.username) return null;
  if (session.sessionVersion !== undefined && session.sessionVersion !== user.sessionVersion) {
    return null;
  }
  return user;
}

/**
 * Server-action helper: return the authenticated user or throw.
 * Throws are caught by the action boundary; callers should return
 * a structured error instead of letting the throw propagate.
 */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Server-action helper: return the authenticated admin user or throw.
 * Admin identity is derived from the ADMIN_USERNAME env var, not stored
 * in the session — so changes to the env var take effect on next check.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminUsername(user.username)) throw new Error("FORBIDDEN");
  return user;
}

/**
 * Page helper: resolve session user, or redirect to / on missing/invalid session.
 */
export async function requireSessionOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return user;
}
