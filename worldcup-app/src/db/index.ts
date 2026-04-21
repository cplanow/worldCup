import { drizzle } from "drizzle-orm/libsql/web";
import { createClient } from "@libsql/client/web";

// Fallback URL for build-time module evaluation only. Next.js's
// data-collection phase imports pages which transitively import this file;
// @libsql/client/web's createClient throws on `undefined`/empty url.
// At runtime on sparta the env vars are set, so this fallback is never used.
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL || "libsql://build-time-placeholder.invalid",
  authToken: process.env.TURSO_AUTH_TOKEN || "build-time-placeholder",
});

export const db = drizzle(client);
