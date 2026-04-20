# worldCup

World Cup 2026 prediction pool — a two-phase family bracket game.

- **Phase 1 (Group Stage):** Rank all 4 teams in each of 12 groups. 2 pts per team in correct position + 5 pt perfect-group bonus (max 156 pts).
- **Phase 2 (Knockout Bracket):** Pick Round of 32 through Final after groups settle. Escalating points: 2/4/8/16/32 per round (max 160 pts).
- **Tiebreakers:** Combined score → Golden Boot pick → Champion pick → Username.

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM | Drizzle |
| Database | [Turso](https://turso.tech/) (libSQL / SQLite) |
| Hosting | Self-hosted Docker on sparta homelab |
| Tests | Vitest |

## Local Development

Prerequisites: Node 20+, a Turso database with credentials, Docker (for production builds).

```bash
cd worldcup-app
cp .env.example .env.local  # then fill in TURSO_CONNECTION_URL, TURSO_AUTH_TOKEN, ADMIN_USERNAME
npm install
npm run dev                 # http://localhost:3000
npm test                    # run vitest suite
```

## Database Migrations

Schema lives in `worldcup-app/src/db/schema.ts`. Migrations are managed by Drizzle.

```bash
cd worldcup-app
export $(grep -v '^#' .env.local | xargs)
npx drizzle-kit generate    # produces SQL in src/db/migrations/
npx drizzle-kit push        # applies to the Turso DB
```

One-off data migrations live in `worldcup-app/scripts/` and are run with the libSQL CLI or via a small Node script using `@libsql/client`.

## Deploy

Deploy target: sparta (`10.0.20.22`), exposed at `https://worldcup.chris.planow.com` on port `3002`.

```bash
# On your laptop
git push origin main

# On sparta (interactive SSH)
cd ~/worldCup
docker compose up -d --build
```

The repo-root `docker-compose.yml` builds from `worldcup-app/Dockerfile` and passes Turso credentials to the build stage (Next.js prerenders pages that hit the DB at module load).

## Project Structure

```
worldCup/
├── worldcup-app/                       # Next.js app
│   ├── src/
│   │   ├── app/(app)/                  # bracket, groups, admin, leaderboard routes
│   │   ├── components/                 # bracket/, groups/, admin/, leaderboard/, ui/
│   │   ├── db/                         # schema, migrations, drizzle client
│   │   ├── lib/                        # scoring engines, actions, utilities
│   │   └── types/
│   ├── scripts/                        # one-off SQL data migrations
│   └── Dockerfile
├── docker-compose.yml                  # sparta deployment
└── _bmad-output/                       # planning artifacts, stories, sprint tracking
```

## Key Files

- Scoring engines: `src/lib/scoring-engine.ts` (bracket), `src/lib/group-scoring-engine.ts` (group + combined)
- Bracket seeding: `src/lib/bracket-seeding.ts` — deterministic R32 pairing from group results
- Server actions: `src/lib/actions/{auth,admin,bracket,group-stage}.ts`
- Admin knockout setup: `src/components/admin/KnockoutSetup.tsx`

See `CHANGELOG.md` for history.
