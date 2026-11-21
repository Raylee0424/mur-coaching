# Frontend Plan — `apps/web` (Phase 1)

> Status: approved 2026-11-21. Implementer: follow §5 in order.

## Context
`apps/api` is live (auth, clients, exercises, workout-logs, progression). `apps/web` does not exist yet. This plan locks the web app's structure, auth model, API contract and Phase 1 screens so an implementer can build it without guessing. Programs, assignments and `GET /me/schedule` are not built; Phase 1 ships UI placeholders for them and never calls them.

**Locked decision (user-approved):** JWT lives in an **httpOnly cookie on the web origin**. **All API calls run on the Next.js server** (Server Components for reads, Server Actions for writes). The token never reaches browser JS. The API URL is therefore a server-only env var `API_URL` (replaces the proposed `NEXT_PUBLIC_API_URL`). No TanStack Query, no client-side fetch.

### API facts the UI must respect (verified in `apps/api/src`)
- Prefix `/api/v1`. Nest error body: `{ statusCode: number; message: string | string[]; error?: string }`. Validation errors have `message: string[]`.
- **Prisma `Decimal` serializes as a JSON string** (`weightKg`, `rpe`, `loadIncrementKg`, `recommendedWeightKg`). `Date` serializes as ISO string. Request bodies send plain numbers.
- JWT payload `{ sub, role, iat, exp }`, 1-day expiry, no refresh endpoint (non-goal). Re-login on expiry.
- `POST /workout-logs`, `PATCH/DELETE /workout-logs/:id` are **CLIENT-only**. Coaches view logs read-only.
- `PATCH /progression/recommendations/:id`: coach may `ACCEPTED|DISMISSED`; client may only `ACCEPTED` (403 otherwise). Non-PENDING → **409**.
- `GET /clients/:id/progression` returns the latest recommendation per exercise (any status) **without exercise name** → UI joins with `GET /exercises` by `exerciseId`.
- `POST .../progression/:exerciseId/evaluate` → **422** when the exercise has no prescription-backed history. `POST .../progression/evaluate` (coach) skips those silently.
- The engine needs a `workoutExerciseId` (prescription) in the last 3 logs of an exercise. Pure ad-hoc logs do not produce recommendations. Phase 1 bridges this with "Repeat last session" (see Screen C).
- `POST /auth/demo { role: 'CLIENT' }` returns the **first seeded demo client** (Alex, `INCREASE_LOAD`). Jordan (`DELOAD` on Bench) is visible from the coach view.
- CORS is irrelevant (server-to-server), but `CORS_ORIGIN` stays as is.

---

## 1. Folder & Route Structure

```
apps/web/
├── package.json              # name "web"; deps below
├── next.config.ts            # minimal; no rewrites
├── tsconfig.json             # extends ../../tsconfig.base.json, overrides below
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example              # API_URL=http://localhost:4000/api/v1
└── src/
    ├── middleware.ts                     # optimistic role gate (cookie claims only)
    ├── app/
    │   ├── layout.tsx                    # <html>, font, globals.css
    │   ├── globals.css                   # tailwind directives
    │   ├── page.tsx                      # never renders: middleware redirects "/" by role or to /login
    │   ├── not-found.tsx
    │   ├── error.tsx                     # client error boundary: message + "Try again"
    │   ├── auth/signout/route.ts         # GET: delete cookie, redirect /login?reason=<reason>
    │   ├── (auth)/
    │   │   ├── layout.tsx                # centered, no shell
    │   │   └── login/page.tsx            # Screen A
    │   ├── (coach)/
    │   │   ├── layout.tsx                # requireUser('COACH') + <AppShell nav={COACH_NAV}>
    │   │   └── coach/
    │   │       ├── page.tsx              # redirect('/coach/clients')
    │   │       ├── clients/page.tsx      # Screen B1 roster
    │   │       ├── clients/[clientId]/page.tsx   # Screen B2 detail
    │   │       ├── exercises/page.tsx    # Screen D
    │   │       └── programs/page.tsx     # <ComingSoon feature="Program builder" />
    │   └── (client)/
    │       ├── layout.tsx                # requireUser('CLIENT') + <AppShell nav={CLIENT_NAV}>
    │       └── client/
    │           ├── page.tsx              # Screen C1 dashboard
    │           ├── log/page.tsx          # Screen C2 logger
    │           └── history/page.tsx      # Screen C3 history
    ├── lib/
    │   ├── env.ts                        # server-only: reads API_URL, throws at import if missing
    │   ├── session.ts                    # server-only: cookie name/options, get/set/clear, decodeClaims
    │   ├── claims.ts                     # edge-safe pure decode of JWT payload (shared by middleware + session)
    │   ├── auth.ts                       # server-only: getCurrentUser() (React cache), requireUser(role)
    │   ├── routes.ts                     # homeFor(role), COACH_NAV, CLIENT_NAV
    │   ├── format.ts                     # formatKg, formatRpe, formatDate, toNumber(DecimalString)
    │   ├── action-result.ts              # ActionResult type + toActionError(err)
    │   └── api/
    │       ├── client.ts                 # apiFetch + ApiError (server-only)
    │       └── endpoints.ts              # one typed function per live endpoint
    ├── actions/                          # 'use server' files, one per domain
    │   ├── auth.ts                       # login, demoLogin, logout
    │   ├── clients.ts                    # createClient
    │   ├── progression.ts                # resolveRecommendation, evaluateAll, evaluateExercise
    │   ├── exercises.ts                  # createExercise, updateExercise
    │   └── workout-logs.ts               # createWorkoutLog
    └── components/
        ├── ui/          # Button, SubmitButton (useFormStatus), Card, Badge, Input, Select, Label,
        │                #   FieldError, FormError, EmptyState, PageHeader
        ├── shell/       # AppShell, NavLink (client, usePathname), UserMenu, DemoBanner
        ├── progression/ # RecommendationCard, RecommendationList, ActionBadge, MetricsTable, EvaluateAllButton
        ├── workout-logs/# WorkoutLogList, WorkoutLogCard, SetLine   (shared by coach detail + client history)
        ├── clients/     # RosterTable, AddClientForm, ClientHeader
        ├── exercises/   # ExerciseFilters, ExerciseTable, ExerciseForm
        ├── logger/      # WorkoutLogger (client), ExerciseBlock, SetRow, logger-model.ts (pure)
        └── placeholders/# ComingSoon, TodayWorkoutPlaceholder
```

Rules:
- Route groups own the guard layout; URL segments `/coach/*` and `/client/*` keep URLs explicit and make middleware matching trivial.
- `lib/api/*`, `lib/session.ts`, `lib/auth.ts`, `lib/env.ts` start with `import 'server-only'`. `lib/claims.ts` has no Node/Next imports (used in Edge middleware).
- Components are Server Components by default. `'use client'` only for: NavLink, forms using `useActionState`, WorkoutLogger, confirm buttons.
- Decimal strings are converted only in `lib/format.ts` (`toNumber`) — never `parseFloat` inline.
- Phase 1 is kg-only. Display `"100 kg × 8 @ RPE 8"`.

**Deps** (`apps/web/package.json`): `next@15`, `react@19`, `react-dom@19`, `@coaching/shared: workspace:*`, `server-only`, `clsx`. Dev: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `tailwindcss@3.4`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`, `vitest`. No UI kit, no form lib, no data-fetching lib.

**Scripts:** `dev: "pnpm --filter @coaching/shared build && next dev -p 3000"`, `build: "pnpm --filter @coaching/shared build && next build"`, `start`, `lint: "next lint"`, `typecheck: "tsc --noEmit"`, `test: "vitest run"`. Root `package.json` adds `"dev:web": "pnpm --filter web dev"`.

**tsconfig overrides** (base is CommonJS/ES2022 without DOM): `lib: ["dom","dom.iterable","es2022"]`, `module: "esnext"`, `moduleResolution: "bundler"`, `jsx: "preserve"`, `noEmit: true`, `isolatedModules: true`, `incremental: true`, `plugins: [{ "name": "next" }]`, `paths: { "@/*": ["./src/*"] }`. `strict` and `noUncheckedIndexedAccess` stay inherited.

---

## 2. Auth & Session Strategy

### Cookie
- Name `rc_session`. Value = raw JWT. `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `path: '/'`, `maxAge = claims.exp - now` (seconds).
- `lib/claims.ts`: `decodeClaims(token): { sub: string; role: Role; exp: number } | null` — base64url-decode the payload segment, shape-check, return `null` if malformed or `exp*1000 <= Date.now()`. **No signature verification** in the web app: claims drive UX routing only; the API verifies on every call and `/auth/me` is the authority.

### Sign-in flows (Server Actions in `actions/auth.ts`)
1. `login(prev, formData)` → `apiFetch<AuthTokenResponse>('/auth/login', { method: 'POST', body, auth: false })` → `setSession(token)` → `redirect(homeFor(claims.role))`. On `ApiError` return `{ ok: false, error: 'Invalid email or password' }`.
2. `demoLogin(formData)` with hidden `role` field → `POST /auth/demo` → same as above. Also used by DemoBanner "Switch to client/coach view".
3. `logout()` → `clearSession()` → `redirect('/login')`.

`homeFor(role)`: `COACH → /coach/clients`, `CLIENT → /client`.

### Middleware (`src/middleware.ts`, Edge)
`matcher: ['/((?!_next/|favicon.ico|auth/signout).*)']`.
```
claims = decodeClaims(cookie rc_session)
path in /coach/* or /client/*:
  no claims            → redirect /login?next=<path>  (and delete cookie if present)
  COACH on /client/*   → redirect /coach/clients
  CLIENT on /coach/*   → redirect /client
path is "/" or "/login":
  claims               → redirect homeFor(role)
  no claims and "/"    → redirect /login
else → next()
```
`/login` honors `next` only if it starts with `/coach` or `/client` (open-redirect guard) and matches the role's area.

### Layout guard (authoritative)
`lib/auth.ts`:
- `getCurrentUser = cache(async () => apiFetch<AuthUser>('/auth/me'))` — React `cache` dedupes per request across layout + pages.
- `requireUser(role)`: calls `getCurrentUser()`; if `user.role !== role` → `redirect(homeFor(user.role))`. Returns `AuthUser`.
- `(coach)/layout.tsx` and `(client)/layout.tsx` call `requireUser(...)` and pass the user to `AppShell`. Pages that need the user (e.g. client pages need `user.id` as `clientId`) call `requireUser` again — cached, no extra request.

### Expired / invalid token
- `apiFetch` on **401** (for `auth !== false` calls) → `redirect('/auth/signout?reason=expired')`.
- `app/auth/signout/route.ts` (GET): deletes `rc_session`, redirects to `/login?reason=expired`. Route handlers can mutate cookies; Server Components cannot — this is why the hop exists. Middleware excludes this path, so a signature-invalid-but-unexpired token cannot loop.
- `/login` shows "Your session expired. Please sign in again." when `reason=expired`.

---

## 3. API Client & Shared Contracts

### 3a. Additions to `@coaching/shared` (pure types + const enums, no runtime deps)
Shared types describe the **JSON wire shape** (strings for dates/decimals). The API keeps its Prisma types internally; Phase 1 does not change API code except one optional re-export (below).

`src/enums.ts` — add (mirroring `schema.prisma`):
```ts
MuscleGroup        // CHEST … FULL_BODY
CoachClientStatus  // ACTIVE | ARCHIVED
AssignmentStatus   // ACTIVE | COMPLETED | CANCELLED
```
Also export `MUSCLE_GROUP_LABELS: Record<MuscleGroup, string>` (UI labels; still a pure const).

`src/common.ts`
```ts
export type IsoDateString = string;
export type DecimalString = string;          // Prisma Decimal on the wire
export interface ApiErrorBody { statusCode: number; message: string | string[]; error?: string }
export interface Paginated<T> { items: T[]; nextCursor: string | null }
```

`src/clients.ts`
```ts
export interface ActiveAssignmentSummary {
  id: string; programId: string; startDate: IsoDateString;
  program: { name: string; durationWeeks: number };
}
export interface ClientView {
  id: string; email: string; name: string; createdAt: IsoDateString;
  notes: string | null; status: CoachClientStatus;
  activeAssignment: ActiveAssignmentSummary | null;
}
export interface CreateClientRequest { email: string; name: string; notes?: string }
export interface CreateClientResponse { client: ClientView; temporaryPassword: string }
export interface UpdateClientRequest { name?: string; notes?: string; status?: CoachClientStatus }
```

`src/exercises.ts`
```ts
export interface ExerciseDto {
  id: string; name: string; muscleGroup: MuscleGroup; equipment: string | null;
  loadIncrementKg: DecimalString; coachId: string | null; createdAt: IsoDateString;
}
export interface CreateExerciseRequest { name: string; muscleGroup: MuscleGroup; equipment?: string; loadIncrementKg?: number }
export type UpdateExerciseRequest = Partial<CreateExerciseRequest>;
export interface ListExercisesQuery { muscleGroup?: MuscleGroup; q?: string }
```

`src/workout-logs.ts`
```ts
export interface SetLogDto { id: string; exerciseLogId: string; setNumber: number; reps: number;
  weightKg: DecimalString; rpe: DecimalString | null; isWarmup: boolean }
export interface ExerciseLogDto { id: string; workoutLogId: string; exerciseId: string;
  workoutExerciseId: string | null; order: number; exercise: { id: string; name: string }; sets: SetLogDto[] }
export interface WorkoutLogDto { id: string; clientId: string; assignmentId: string | null;
  workoutId: string | null; performedAt: IsoDateString; notes: string | null; createdAt: IsoDateString;
  exerciseLogs: ExerciseLogDto[] }
export interface SetLogInput { reps: number; weightKg: number; rpe?: number; isWarmup?: boolean }
export interface ExerciseLogInput { exerciseId: string; workoutExerciseId?: string; sets: SetLogInput[] }
export interface CreateWorkoutLogRequest { assignmentId?: string; workoutId?: string;
  performedAt: IsoDateString; notes?: string; exerciseLogs: ExerciseLogInput[] }
export interface UpdateWorkoutLogRequest { performedAt?: IsoDateString; notes?: string; exerciseLogs?: ExerciseLogInput[] }
export interface ListWorkoutLogsQuery { from?: IsoDateString; to?: IsoDateString; cursor?: string; limit?: number }
export const WORKOUT_LOG_LIMITS = { maxExercises: 30, maxSets: 50, maxReps: 1000, maxWeightKg: 9999, rpeMin: 1, rpeMax: 10 } as const;
```

`src/progression.ts`
```ts
export interface SessionMetrics { exerciseLogId: string; performedAt: IsoDateString; workingSets: number;
  volumeKg: number; topWeightKg: number; topSetReps: number; e1rmKg: number; avgRpe: number | null }
export interface RecommendationDto { id: string; clientId: string; exerciseId: string;
  action: RecommendationAction; status: RecommendationStatus;
  recommendedWeightKg: DecimalString | null; recommendedRepsMin: number | null;
  recommendedRepsMax: number | null; recommendedSets: number | null;
  reason: string; metrics: SessionMetrics[]; sourceExerciseLogIds: string[];
  createdAt: IsoDateString; resolvedAt: IsoDateString | null }
export interface ProgressionHistoryResponse { exercise: { id: string; name: string };
  recommendations: RecommendationDto[]; series: SessionMetrics[] }
export type ResolvableStatus = 'ACCEPTED' | 'DISMISSED';
export interface UpdateRecommendationRequest { status: ResolvableStatus }
```
Optional one-line API change: `apps/api/src/modules/progression/engine/types.ts` re-exports `SessionMetrics` from `@coaching/shared` instead of declaring it, so the engine output and the UI type cannot drift. (Engine `performedAt` is already `string`.)

`src/index.ts` re-exports all modules. After edits: `pnpm --filter @coaching/shared build` and `pnpm --filter api build` must both pass.

### 3b. `lib/api/client.ts`
```ts
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ApiErrorBody } from '@coaching/shared';
import { API_URL } from '@/lib/env';
import { SESSION_COOKIE } from '@/lib/session';

export class ApiError extends Error {
  constructor(readonly status: number, readonly messages: string[]) { super(messages.join('; ')); }
}

type Query = Record<string, string | number | undefined>;
interface ApiFetchOptions { method?: 'GET'|'POST'|'PATCH'|'DELETE'; body?: unknown; query?: Query; auth?: boolean }

export async function apiFetch<T>(path: `/${string}`, opts: ApiFetchOptions = {}): Promise<T>
```
Behavior (exact):
1. URL = `API_URL + path` + query string built from defined entries only (`URLSearchParams`).
2. Headers: `Accept: application/json`; `Content-Type: application/json` when `body !== undefined`; `Authorization: Bearer <cookie>` when `auth !== false` and cookie exists.
3. `fetch(url, { method, headers, body: JSON.stringify(body), cache: 'no-store' })`. All data is per-user; never cache.
4. Network failure (fetch throws) → `throw new ApiError(503, ['API is unreachable'])`.
5. `res.status === 204` → `return undefined as T`.
6. `!res.ok`: parse body as `ApiErrorBody` (fallback `[res.statusText]`); normalize `message` to `string[]`.
   - `401` and `auth !== false` → `redirect('/auth/signout?reason=expired')`.
   - else `throw new ApiError(status, messages)`.
7. `return (await res.json()) as T`.

### 3c. `lib/api/endpoints.ts`
One function per live endpoint, grouped as plain objects. Pages and actions import these, never `apiFetch` directly.
```ts
export const authApi = { login, demo, me };
export const clientsApi = { list(q?), get(id), create(body), update(id, body) };
export const exercisesApi = { list(q?), create(body), update(id, body) };
export const workoutLogsApi = { create(body), listForClient(clientId, q?), get(id) };
export const progressionApi = { latest(clientId), history(clientId, exerciseId), evaluateAll(clientId),
  evaluateOne(clientId, exerciseId), resolve(recId, status) };
```
Future endpoints (`programsApi`, `assignmentsApi`, `meApi.schedule`) are added here when the API ships them. Do not add stubs now.

### 3d. Server Action contract (`lib/action-result.ts`)
```ts
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
export function toActionError(err: unknown): { ok: false; error: string }
```
Every action body:
```ts
try { … ; revalidatePath(…); return { ok: true, data }; }
catch (err) { unstable_rethrow(err); return toActionError(err); }   // rethrows redirect/notFound
```
`toActionError`: `ApiError` → `messages.join(' ')` (409/422/400 messages are user-readable as written by the API); anything else → `'Something went wrong. Please try again.'` and `console.error`.
Forms use `useActionState(action, null)` and render `FormError` when `state?.ok === false`.

---

## 4. Phase 1 Screens

### Data-fetching map
| Screen | Route | Server reads (parallel `Promise.all`) | Server Actions → API | Revalidate |
|---|---|---|---|---|
| A Login/Demo | `/login` | none | `demoLogin` → `POST /auth/demo`; `login` → `POST /auth/login` | — (redirect) |
| B1 Roster | `/coach/clients` | `GET /clients` | `createClient` → `POST /clients` | `/coach/clients` |
| B2 Client detail | `/coach/clients/[clientId]` | `GET /clients/:id`, `GET /clients/:id/progression`, `GET /exercises`, `GET /clients/:id/workout-logs?limit=10` | `resolveRecommendation` → `PATCH /progression/recommendations/:id`; `evaluateAll` → `POST /clients/:id/progression/evaluate`; `evaluateExercise` → `POST /clients/:id/progression/:exerciseId/evaluate` | `/coach/clients/[clientId]` |
| C1 Client dashboard | `/client` | `GET /clients/:me`, `GET /clients/:me/progression`, `GET /exercises`, `GET /clients/:me/workout-logs?limit=3` | `resolveRecommendation` (ACCEPTED only) | `/client` |
| C2 Logger | `/client/log` | `GET /exercises`, `GET /clients/:me/workout-logs?limit=1` | `createWorkoutLog` → `POST /workout-logs` | `/client`, `/client/history` |
| C3 History | `/client/history?cursor=` | `GET /clients/:me/workout-logs?limit=20&cursor=` | — | — |
| D Exercise library | `/coach/exercises?q=&muscleGroup=&edit=` | `GET /exercises?q=&muscleGroup=` | `createExercise` → `POST /exercises`; `updateExercise` → `PATCH /exercises/:id` | `/coach/exercises` |
| Placeholder | `/coach/programs` | none | none | — |

`:me` = `requireUser('CLIENT').id`. `GET /clients/:id` for a 404 → call `notFound()`.

### A. Login / Recruiter Demo Landing — `(auth)/login/page.tsx`
- **Hero:** product name, one-line pitch ("Coach-built programs + an engine that tells you when to add weight or deload"), 3 bullet value props.
- **DemoButtons** (server component, two `<form action={demoLogin}>` with hidden `role`):
  - "Demo as Coach" — subtitle "Morgan · sees 2 clients, one ready to progress, one plateaued".
  - "Demo as Client" — subtitle "Alex · log a session, see your next target".
  - Each uses `SubmitButton` (pending spinner, disabled while pending).
- **EmailLoginForm** (`'use client'`, `useActionState(login)`) inside `<details>` "Sign in with email": email, password, FormError.
- Banner when `searchParams.reason === 'expired'`.

### B1. Coach Roster — `coach/clients/page.tsx`
- `PageHeader` "Clients" + count.
- `RosterTable`: name (link to detail), email, status `Badge`, active program name (or "No program"), joined date. Sorted by API (name asc). `EmptyState` if none.
- `AddClientForm` (`'use client'`, collapsible): name, email, notes. On success show the `temporaryPassword` **once** in a highlighted box with a copy button and the text "Share this with your client; it won't be shown again." Do not persist it anywhere.
- Archived clients: API returns them; show with muted row and `ARCHIVED` badge. Archive/restore UI is deferred.

### B2. Coach Client Detail — `coach/clients/[clientId]/page.tsx`
Layout: header, then two columns on `lg` (recommendations 2/3, recent sessions 1/3), stacked on mobile.
- `ClientHeader`: name, email, status badge, active program summary (`program.name`, "Week N of M" computed from `startDate`) or "No program assigned" + link to `/coach/programs` (placeholder). Coach notes shown read-only if present.
- `EvaluateAllButton` (form → `evaluateAll`): label "Re-run progression engine". Shows "Evaluated N exercises" from result.
- `RecommendationList`: receives `RecommendationDto[]` + `Map<exerciseId, ExerciseDto>`. Sort: `PENDING` first, then by `createdAt` desc. Resolved/superseded cards go under a collapsed `<details>` "Resolved (n)".
- `RecommendationCard`:
  - `ActionBadge`: `INCREASE_LOAD` emerald "Increase load", `INCREASE_REPS` sky "Add reps", `HOLD` slate "Hold", `DELOAD` amber "Deload".
  - Title = exercise name (fallback "Unknown exercise").
  - Target line: `recommendedSets × recommendedRepsMin–Max @ recommendedWeightKg kg` (omit null parts).
  - `reason` paragraph.
  - `MetricsTable` from `metrics` (oldest → newest): date, top set (`topWeightKg × topSetReps`), e1RM, avg RPE, volume.
  - Status pill when not PENDING (`ACCEPTED`/`DISMISSED`/`SUPERSEDED` + `resolvedAt`).
  - If PENDING: **Accept** and **Dismiss** buttons (each a form → `resolveRecommendation(recId, status, clientId)`), plus a small "Re-evaluate" button → `evaluateExercise`. 409 shows "This recommendation was already resolved or replaced." and revalidates. 422 shows the API message.
  - `canDismiss` prop: true for coach, false for client (C1 reuses the card).
- `WorkoutLogList` (recent 10, read-only) → link "No sessions yet" empty state.

### C1. Client Dashboard — `client/page.tsx`
- Greeting with name and coach status (`user.coachId ? 'Coached' : 'No active coach'`).
- `TodayWorkoutPlaceholder`: card "Today's workout" with copy "Your program schedule will appear here." and a primary CTA "Log a session" → `/client/log`. Extension point: replaced by `/me/schedule` data later; component takes no props now.
- "Your next targets": `RecommendationList` with `canDismiss={false}`, showing PENDING only; resolved collapsed.
- "Recent sessions": `WorkoutLogList` limit 3 + link to `/client/history`.

### C2. Client Workout Logger — `client/log/page.tsx` + `components/logger/WorkoutLogger.tsx`
Server page loads exercises and the latest log, renders `<WorkoutLogger exercises={…} lastLog={…|null} />`.

`logger-model.ts` (pure, unit-tested):
```ts
interface DraftSet { key: string; reps: string; weightKg: string; rpe: string; isWarmup: boolean }
interface DraftExercise { key: string; exerciseId: string; workoutExerciseId?: string; sets: DraftSet[] }
interface DraftLog { performedAtLocal: string; notes: string; assignmentId?: string; workoutId?: string; exercises: DraftExercise[] }
fromLastLog(log: WorkoutLogDto): DraftLog          // copies assignmentId, workoutId, workoutExerciseId, set values
validateDraft(d: DraftLog): { ok: true; request: CreateWorkoutLogRequest } | { ok: false; errors: Record<string, string> }
```
Validation mirrors the API DTO via `WORKOUT_LOG_LIMITS`: ≥1 exercise (≤30), each with exerciseId and ≥1 set (≤50); reps integer 0–1000; weight 0–9999, ≤2 decimals; RPE empty or 1–10, ≤1 decimal; `performedAt` not in the future. Errors keyed `exercises.{i}.sets.{j}.reps` and rendered under the field. `performedAtLocal` (`datetime-local`, default now) converts with `new Date(local).toISOString()` in the browser.

UI:
- Top bar: date/time input, notes textarea.
- **"Repeat last session"** button (shown when `lastLog` exists): replaces the draft with `fromLastLog(lastLog)`. This carries the prescription ids so the engine evaluates the new log. It is the Phase 1 bridge until `/me/schedule`.
- `ExerciseBlock` per exercise: exercise `<select>` (grouped by muscle group via `MUSCLE_GROUP_LABELS`), remove button, sets table of `SetRow` (set #, weight kg, reps, RPE, warm-up checkbox, remove), "Add set" (copies previous set values). Changing the exercise clears its `workoutExerciseId`.
- "Add exercise" button. Inputs use `inputMode="decimal"` / `"numeric"`, min 44px touch targets.
- Submit: `validateDraft` → on ok call `createWorkoutLog(request)` inside `startTransition` (action takes a typed object, not FormData). On success `redirect('/client/history?logged=1')` from the action. On error show `FormError`; draft stays intact.

### C3. Client History — `client/history/page.tsx`
- Success banner when `logged=1`: "Session logged. Your targets were updated."
- `WorkoutLogList` → `WorkoutLogCard`: date (`formatDate`), notes, per exercise: name + `SetLine`s (`100 kg × 8 @ RPE 8`, warm-ups muted and labeled).
- Pagination: "Older sessions" link to `?cursor=<nextCursor>` when non-null; "Newest" link to reset. Server-rendered, no client state.
- Edit/delete are deferred (API supports them; not Phase 1 scope).

### D. Exercise Library — `coach/exercises/page.tsx`
- `ExerciseFilters`: GET `<form>` with `q` text and `muscleGroup` select; submits to the same URL (server re-renders).
- `ExerciseTable`: name, muscle group label, equipment, increment (`formatKg`), source badge (`Global` when `coachId === null`, else `Custom`). "Edit" link only on rows where `coachId === user.id` → `?edit=<id>` (preserve filters).
- `ExerciseForm` (`'use client'`, `useActionState`): name, muscleGroup, equipment, loadIncrementKg (number, step 0.25, 0.25–25, default 2.5). Used for create (top of page, collapsible) and edit (rendered inline under the row whose id matches `searchParams.edit`, prefilled). Edit success → `redirect` to the URL without `edit`. 409 shows "An exercise with this name already exists".
- Edit requests send only changed fields.

### Shell & placeholders
- `AppShell`: left sidebar on `md+`, top bar + horizontal nav on mobile. `COACH_NAV`: Clients, Exercises, Programs (with "Soon" badge). `CLIENT_NAV`: Today, Log session, History. `UserMenu`: name, role, Sign out (form → `logout`).
- `DemoBanner` when `user.isDemo`: "You're exploring demo data." + "Switch to client view"/"Switch to coach view" (form → `demoLogin` with the other role).
- `ComingSoon({ feature })`: card explaining the feature and that it ships with the Programs API.
- Accessibility: every input has a `<label>`; errors linked via `aria-describedby`; buttons have visible focus rings; color is never the only signal (badges carry text).

---

## 5. Implementation Order (strict; finish exit criteria before the next step)

### Step 1 — Scaffold
- Create `apps/web` (package.json, tsconfig, next.config.ts, tailwind/postcss, globals.css, root layout, `.env.example`, `.env.local` with `API_URL=http://localhost:4000/api/v1`). Add `dev:web` to root.
- Extend `@coaching/shared` with §3a types; optional `SessionMetrics` re-export in API engine.
- Add `components/ui/*` primitives and `lib/format.ts`.
- **Exit:** `pnpm --filter @coaching/shared build`, `pnpm --filter api build`, `pnpm --filter web typecheck`, `pnpm --filter web build` all pass; `/` renders a placeholder page.

### Step 2 — Auth & Shell
- `lib/env.ts`, `lib/claims.ts`, `lib/session.ts`, `lib/api/client.ts`, `lib/api/endpoints.ts`, `lib/auth.ts`, `lib/routes.ts`, `lib/action-result.ts`, `actions/auth.ts`.
- `middleware.ts`, `auth/signout/route.ts`, `(auth)` login page (Screen A), `(coach)`/`(client)` layouts, `AppShell`, `DemoBanner`, `ComingSoon`, stub pages that render the user's name.
- Vitest: `claims.test.ts` (valid, malformed, expired, wrong role value).
- **Exit:** Demo Coach lands on `/coach/clients`; Demo Client lands on `/client`; client visiting `/coach/clients` is redirected to `/client` and vice versa; logged-out visit to `/coach/clients` goes to `/login?next=…`; editing the cookie to garbage then loading a page ends on `/login?reason=expired` with no loop; Sign out and Switch role work.

### Step 3 — Coach + Progression UI
- Screens B1, B2, D; `actions/clients.ts`, `actions/progression.ts`, `actions/exercises.ts`; `components/progression/*`, `components/clients/*`, `components/exercises/*`, `components/workout-logs/*` (read-only list).
- **Exit (against fresh seed `pnpm --filter api db:seed`):** roster shows Alex and Jordan; Alex detail shows a PENDING `INCREASE_LOAD` card, Jordan shows `DELOAD` on Bench Press with metrics table; Accept moves the card to Resolved with `ACCEPTED`; a second Accept on a stale tab shows the 409 message; "Re-run progression engine" produces fresh PENDING cards; exercise create, duplicate-name 409, and edit of a custom exercise work; global exercises have no Edit link; Add Client shows the temp password once.

### Step 4 — Client Logger + Polish
- Screens C1, C2, C3; `actions/workout-logs.ts`; `components/logger/*` with `logger-model.ts`; reuse `RecommendationList` with `canDismiss={false}`.
- Vitest: `logger-model.test.ts` (`fromLastLog` copies prescription ids; `validateDraft` rejects empty session, reps 1.5, RPE 11, weight with 3 decimals, future date; builds the exact request shape).
- Polish: `error.tsx`, `not-found.tsx`, loading states via `SubmitButton`, empty states everywhere, mobile pass at 375px, keyboard pass on the logger.
- **Exit:** as Demo Client, "Repeat last session" → bump weights → submit → lands on history with banner and the new session at top; dashboard shows a new PENDING recommendation for the repeated exercises; Accept works and Dismiss is not offered; a manual ad-hoc log submits successfully; `pnpm --filter web lint typecheck test build` pass.

---

## Deferred (not Phase 1)
Programs builder, assignments, `/me/schedule` (Today card stays a placeholder); per-exercise progression chart (`GET /clients/:id/progression/:exerciseId`); workout log edit/delete UI; client archive/notes editing; lb display toggle; E2E browser tests.

## Verification (end-to-end)
1. `pnpm --filter api db:seed` then `pnpm dev:api` and `pnpm dev:web`.
2. Walk the Step 2–4 exit criteria in a browser at `http://localhost:3000`.
3. Confirm in DevTools → Application → Cookies that `rc_session` is `HttpOnly`, and in the Network tab that the browser makes **no** requests to `:4000`.
4. `pnpm --filter web lint typecheck test build` and `pnpm --filter api build` all green.
