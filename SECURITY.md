# Security Policy

## Reporting a Vulnerability

If you discover a security issue in this repository or the running service at
`https://worldcup.chris.planow.com`, please **do not open a public GitHub
issue**. Instead:

- Email: `chris.planow@gmail.com`
- Subject line: `[worldCup security] <short description>`

Include:
- A description of the issue
- Steps to reproduce
- Impact (what an attacker can do)
- Any suggested mitigation

You should get a response within a few days. Critical issues affecting live
users will be prioritized. There is no bug bounty — this is a family pool app,
not a commercial service.

## Scope

In scope:
- The Next.js application in `worldcup-app/`
- The deployment configuration (`docker-compose.yml`, `worldcup-app/Dockerfile`)
- Authentication and authorization logic
- Any API action exposed via Next.js Server Actions
- The public production site

Out of scope:
- Social-engineering the administrator
- Physical/network attacks on the sparta homelab
- Vulnerabilities in unrelated third-party services (report those upstream)

## Security Model

### Trust boundaries
- The admin user has full control over tournament state (matchups, results,
  locks, seeding, password resets). Admin is identified by matching
  `ADMIN_USERNAME` on the session. The admin account cannot be
  self-registered.
- Authenticated users can only mutate their own picks. Server actions derive
  `userId` from the signed session, never from request body.
- Unauthenticated users can register, log in, and consume a password-reset
  token (via a one-time URL the admin shares out-of-band).

### Session architecture
- Sessions are signed + encrypted via `iron-session` using `SESSION_SECRET`
  (32+ chars, AES-256 symmetric key).
- Session cookie: `httpOnly`, `secure`, `sameSite=lax`, 30-day `maxAge`.
- Each user has a `session_version` in the DB; a password change bumps the
  version and invalidates all outstanding sessions on other devices.

### Password handling
- PBKDF2-SHA256, 100,000 iterations, 16-byte salt, 256-bit output.
- Stored as `salt:hash` hex in `users.password_hash`.
- Constant-time compare via `crypto.timingSafeEqual`.
- Minimum 10 chars, rejects all-lowercase / all-uppercase / all-digits, and
  a short blocklist of common patterns (`password`, `qwerty`, etc.).
- No "forgot my password" self-service — admin generates a one-time,
  time-limited (1 hour) reset token via the admin UI and shares the URL with
  the user.

### Rate limiting
In-process token-bucket per IP and per username on the auth endpoints. Limits:
registration 5/hr, login 10/10min per IP + 5/15min per username, password
reset 3/hr, token consumption 10/hr, change password 5/hr per user. State is
per-container; acceptable for the single-instance sparta deploy.

### Audit log
Admin and security-sensitive actions are appended to the `audit_log` table
(immutable, append-only). Covers: result entry/correction, lock toggles,
reset-token generation, password change, reset-token consumption.

## Deployment

- Self-hosted Docker on sparta (`10.0.20.22`). Caddy on citadel
  (`10.0.20.20`) terminates TLS and reverse-proxies to sparta:3002.
- `SESSION_SECRET` and `TURSO_AUTH_TOKEN` are in `~/.env` on sparta, readable
  only by the deploy user. Rotate the secret periodically; rotation
  invalidates all active sessions and forces re-login.
- No build-time Turso access — all routes are dynamic, so the token stays
  out of build logs.

## Known Limitations

- Rate-limit state is in-memory; doesn't survive a container restart and
  isn't shared across replicas (sparta only runs one replica).
- The reset-token delivery channel is out-of-band (admin shares the URL via
  text/email). There's no in-app notification system.
- Admin is identified by a single env-var username — no multi-admin support
  and no admin list.

## Version History

- 2026-04-21 — security audit phase 3 shipped (rate limiting, audit log,
  tokenized reset, session rotation, password change, server-side pick
  validation, bracket cascade transactions)
- 2026-04-21 — security audit phase 2 shipped (iron-session, IDOR fixes,
  `setPassword` removal)
- 2026-04-20 — security audit phase 1 shipped (Next.js CVE upgrade, CSP
  headers, timing-safe compare)
- 2026-04-20 — initial security audit (30 findings)
