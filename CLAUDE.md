# MUR Coaching

Coach–client strength platform with a deterministic progression engine.

## Stack
- pnpm monorepo, Node 20+
- `apps/api`: NestJS 10, Prisma 5, PostgreSQL, JWT, base path `/api/v1`
- `apps/web`: Next.js 15 App Router, React 19, Tailwind 3
- `packages/shared`: wire types and enums (`@coaching/shared`)

## Verify
Run the checks that match the change:

```bash
pnpm --filter api test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm build
```

## Invariants
- The browser never calls the API. The JWT stays in the httpOnly `rc_session` cookie.
- Keep the progression engine pure and deterministic. AI must not replace its decisions.
- Decimals and dates are strings on the wire.
- Every coach route enforces `CoachClient` tenancy.

## Low-Token Context Protocol
Vault: `/Users/raylee/Documents/Obsidian Vault/Project Brain/Projects/MUR Coaching/`

1. Always start by reading ONLY `MUR Coaching MOC.md` and `MUR Coaching - Active State.md`.
2. Then open ONLY the 1–2 topic notes relevant to the current task.
3. Never bulk-read the whole folder.

## Memory Offload Rule
After completing work:

1. Overwrite `MUR Coaching - Active State.md`.
2. Append a 1-line entry to `MUR Coaching - Feature Log.md`, keeping newest first.
3. Update status in `MUR Coaching - Roadmap.md`.
