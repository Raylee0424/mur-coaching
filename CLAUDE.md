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
Brain: `docs/brain/` (symlink to `/Users/raylee/Documents/Obsidian Vault/Project Brain/Projects/MUR Coaching/`, gitignored).

1. Every session, read ONLY `docs/brain/MUR Coaching MOC.md` and `docs/brain/MUR Coaching - Active State.md`.
2. Then open ONLY the single domain note for the task plus `docs/brain/MUR Coaching - Stitch Screens.md`.
3. NEVER scan or bulk-read `design/stitch/`. Read ONLY the `code.html` files that Stitch Screens maps to the current feature.
4. Never bulk-read the brain folder.

## Memory Offload Rule
After every batch, so the user can `/clear` before the next one:

1. Overwrite `MUR Coaching - Active State.md`.
2. Append a 1-line entry to `MUR Coaching - Feature Log.md`, newest first.
3. Update the domain note status (`planned` → `partial` → `done`) and `MUR Coaching - Roadmap.md`.
