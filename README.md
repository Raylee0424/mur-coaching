# Ray Coaching

A coach–client strength training platform. Clients log their sets (weight, reps, RPE). A deterministic progression engine reads each lift's last 3 sessions and recommends the next move. Coaches review and accept those calls across their roster.

| Call | Meaning |
| --- | --- |
| `INCREASE_LOAD` | Target reps hit below the RPE cap: add weight |
| `INCREASE_REPS` | Solid at the current load: add reps first |
| `HOLD` | Near the RPE ceiling: repeat the load |
| `DELOAD` | Fatigue or a performance drop: reduce the load |

## Stack

pnpm monorepo:

- `apps/api`: NestJS 10, Prisma 5, PostgreSQL, JWT auth. Served under `/api/v1`.
- `apps/web`: Next.js 15 (App Router), React 19, Tailwind CSS 3. All API calls run on the Next.js server. The JWT lives in an httpOnly cookie (`rc_session`) and never reaches browser JavaScript.
- `packages/shared`: enums and types shared by both apps.

## Getting started

Requires Node 20+, pnpm and a local PostgreSQL.

```bash
pnpm install
```

Create the env files from the examples, then fill in your database credentials and a JWT secret of at least 32 characters:

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Set up the database and load the demo data:

```bash
pnpm --filter api prisma:migrate
```

```bash
pnpm --filter api db:seed
```

Run the API (port 4000) and the web app (port 3000) in two terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Open http://localhost:3000. Use **Try Live Demo** to sign in as the seeded coach or client without a password.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Build every package |
| `pnpm --filter web lint` | Lint the web app |
| `pnpm --filter web typecheck` | Type-check the web app |
| `pnpm --filter web test` | Run the web unit tests (Vitest) |
| `pnpm --filter api test` | Run the API unit tests (Vitest) |
| `pnpm --filter api db:seed` | Reset and reseed the demo data |

## Docs

- [docs/FRONTEND_PLAN.md](docs/FRONTEND_PLAN.md): web app structure, auth model and API contract.
