# Stitch design → project map

Source designs: `design/stitch/<folder>/code.html` (44 folders, Tailwind HTML mockups; tokens in `design/stitch/apexmetric_design_system.md` and `apps/web/tailwind.config.ts`). The full folder → phase → route map lives in the Obsidian note `MUR Coaching - Stitch Screens` (`docs/brain/`); the table below covers the first build only, and several folder names were renamed since (`client_today` → `athlete_web_home_today_dashboard`, `client_active_workout_logger` → `athlete_web_active_workout_logger`).

| Stitch folder | Project location | Gap |
| --- | --- | --- |
| ray_coaching_developer_grade_landing_page, ray_coaching_mobile_landing_page | `app/page.tsx`, `components/marketing/*` | restyle to match |
| auth_sign_in_account_flows | `(auth)/login` + new `(auth)/signup`, `forgot`, `reset`, `invite/[token]`, `verify` | API: signup, reset, verify, invites, lockout |
| coach_onboarding_4_step_stepper | `(onboarding)/welcome/coach`, `components/onboarding/CoachOnboarding.tsx` | invite step uses invite API; starter library import |
| client_onboarding_5_steps | `(onboarding)/welcome/client`, `ClientOnboarding.tsx` | restyle |
| coach_roster_overview, 1._invite_client_modal | `coach/clients`, `RosterTable`, `AddClientForm` → InviteClientModal | API: roster stats, filters, invites w/ program+start date |
| coach_client_detail, coach_client_overview_tab | `coach/clients/[clientId]` | tabs Overview/Lifts/History/Notes; API: overview stats + calendar |
| 2._client_settings_drawer | `ClientSettingsDrawer.tsx` | restyle; pause/archive |
| coach_progression_queue | `coach/progression` | API: coach-wide pending list + bulk resolve |
| why_this_call_coach_560px_drawer | `progression/WhyThisCall.tsx` | API: rule trace + call history |
| 3._edit_target_manually_modal | `EditTargetButton.tsx` | restyle |
| 8._engine_rules_editor_settings | `coach/settings`, `EngineRulesEditor.tsx` | restyle |
| coach_exercise_library | `coach/exercises` | API: per-exercise rpeCap/rep range, override count, duplicate, archive |
| 5._program_builder_drawer | `coach/programs/*`, `ProgramBuilder.tsx` | API: templates flag, duplicate day |
| client_today, why_this_call_client_bottom_sheet, 9._target_changed_explainer_bottom_sheet | `client/page.tsx` | API: `GET /me/today` |
| client_active_workout_logger, 1._edit_logged_set_bottom_sheet, 2._rpe_guide_bottom_sheet, 7._swap_exercise_bottom_sheet | `client/log`, `components/logger/*`, `EditSetButton` | API: swap alternatives; session-complete targets |
| client_history, client_lift_detail | `client/history`, `client/lifts/[exerciseId]` | restyle; per-lift charts tab |

Decisions (user, 2026-11-21): build all auth flows; emails are logged to the API console (no provider); swaps are recorded on the log, not notified; invites are copyable links. ~~No messaging~~ lifted 2026-11-24: messaging is in scope (`coach_web_real_time_coach_client_messaging`, Phase 2).

## API additions

All paths are under `/api/v1`. Shared types live in `packages/shared/src/*` (re-exported from the index); web wrappers are in `apps/web/src/lib/api/endpoints.ts`. Weights are kg, stored decimals are strings on the wire (`DecimalString`), computed stats are numbers. Migration: `stitch_match`.

### Auth (`authApi`)

| Endpoint | Types | Notes |
| --- | --- | --- |
| `POST /auth/signup` (public) | `SignupRequest` → `AuthTokenResponse` | Password ≥ 8 chars with a digit (`isValidPassword`). `emailVerifiedAt` null; 6-digit code is "mailed" (API log). 409 if the email exists. |
| `POST /auth/verify-email` | `VerifyEmailRequest` → `AuthUser` | 15 min expiry; code dies after 5 wrong guesses. |
| `POST /auth/verify-email/resend` | 204 | Invalidates older codes. |
| `POST /auth/forgot-password` (public) | `ForgotPasswordRequest`, 204 | Always 204. Reset link `WEB_URL/reset?token=…`, single use, 1 h. |
| `POST /auth/reset-password` (public) | `ResetPasswordRequest`, 204 | Also clears the lockout. |
| `POST /auth/login` | unchanged | 5 failed logins lock the account 15 min: **423** with a message. Checked before the password. Demo login unaffected. |

`AuthUser` gained `emailVerified: boolean`. Only sha256 hashes of codes/tokens are stored (`AuthToken` table). `MailService` just logs; `WEB_URL` env (default `http://localhost:3000`).

### Invites (`invitesApi`, `clientsApi`)

| Endpoint | Types |
| --- | --- |
| `POST /clients/invites` (coach) | `CreateInviteRequest` → `CreateInviteResponse` (`inviteUrl` returned once) |
| `GET /clients/invites` (coach) | `InviteDto[]` (not accepted; expired ones flagged `expired`) |
| `DELETE /clients/invites/:id` (coach) | 204; 404 for accepted or foreign invites |
| `GET /invites/:token` (public) | `InvitePreviewDto`; 404 unknown, 410 expired/used |
| `POST /invites/:token/accept` (public) | `AcceptInviteRequest` → `AcceptInviteResponse` (token); 409 if email exists |

Decisions: re-inviting the same email replaces the coach's earlier pending invite; email already registered → 409 at creation too. Accepting creates the CLIENT (email verified), the coach link and, when the invite has a program, an ACTIVE assignment (start date = invite's, else today). `POST /clients` (temporary password) is unchanged.

### Roster and client overview (`clientsApi`)

- `GET /clients/summary?status=&needsAttention=&q=` → `RosterSummaryDto` (`kpis`, filter `counts`, `items: RosterClientDto[]`). `GET /clients` is unchanged.
- `GET /clients/:id/overview?month=YYYY-MM` (coach) → `ClientOverviewDto` (`adherence`, `weeklyVolumeKg`, `avgRpe` + `cap`, `streak`, `days: CalendarDay[]`).

Decisions: a scheduled session lands on `startDate + (week-1)*7 + (day-1)` days and counts as completed when a log exists for that workout (any date). Adherence is over the last 28 days; today's unlogged session is not a miss. Needs attention (ACTIVE clients only): pending DELOAD, adherence < 85, or no session in 7 days (the last only once a started assignment exists). Default roster view hides ARCHIVED; KPIs cover ACTIVE clients only. Calendar `HIGH_RPE` = session average RPE above the client's cap (client override, else coach rule, else 8). Streak = consecutive scheduled sessions completed.

### Progression (`progressionApi`)

- `GET /progression/recommendations?status=&action=&q=` (coach) → `RecommendationQueueResponse`. Default status PENDING; ACTIVE clients only; counts ignore the `action` filter.
- `POST /progression/recommendations/bulk` (coach) `BulkResolveRequest` → `BulkResolveResponse`. Any id outside the coach's clients (or missing) makes the whole call 404; non-PENDING ids are `SKIPPED`.
- `GET /progression/recommendations/:id/explain` (coach or owning client) → `ExplainDto` (`rules: RuleTraceStep[]`, `sessions`, `settings`, `history: CallHistoryEvent[]`). `rules` is null if a source session was deleted. The trace is `traceRules()` in `engine/trace.ts`; tests check it agrees with `evaluate()`. Override events come from each recommendation's latest override (only one is stored per call).
- `GET /workout-logs/:id/next-targets` (owner or coach) → `NextTargetsDto`. `POST /workout-logs` is unchanged; it already re-runs the engine, and this reads the result.

### Exercises (`exercisesApi`)

`ExerciseDto` gained `rpeCap`, `repsMin`, `repsMax`, `archivedAt`, `overrideClientCount`. `create`/`update` accept `rpeCap` and the rep range (both bounds or neither; `null` clears).

- `POST /exercises/:id/duplicate` (coach): copy of a global or own exercise named `X (copy)`.
- `DELETE /exercises/:id` (coach): soft archive, 204; global or foreign rows 404. Archived exercises vanish from the list and swap picker; programs, logs and recommendations keep working.
- `GET /exercises/:id/alternatives` (client) → `ExerciseAlternativesDto`: same muscle group, unarchived, visible to the client's coach, with the client's latest top set.

Decisions: precedence is client override → **exercise rule** → prescription → coach rule → default for the RPE cap and rep range (source `EXERCISE`); the exercise's load increment keeps source `EXERCISE` as before. `overrideClientCount` (coach lists only, 0 for clients) = the coach's clients who logged the exercise and have any per-client engine override, because per-exercise client overrides do not exist. Only coach-owned exercises can be edited or archived; duplicate a global one to set rules on it. Archived names stay reserved (unique per coach).

### Today (`meApi.today`)

`GET /me/today` (client) → `TodayDto`. `state` is `NO_PROGRAM`, `READY` or `WEEK_COMPLETE`. The workout is the first unlogged workout of the current program week. Target order per exercise: a still-current ACCEPTED recommendation (coach override wins, with note and approver) → prescription weight → last session's top weight (`LAST_SESSION`, added before the baseline) → onboarding baseline. An accepted call is stale once the client logged the exercise afterwards. `recommendationId` points at the newest call still about the upcoming session. `banner` = latest ACCEPTED call resolved within 3 days (`approvedByName` null when auto-approved).

### Programs (`programsApi`)

`ProgramDto` and `ProgramSummaryDto` gained `isTemplate`; `ProgramTreeInput.isTemplate` is optional. `GET /programs?template=true|false`. `POST /programs/:id/duplicate` (`DuplicateProgramRequest`: `name?`, `asTemplate?`): deep copy without assignments; `asTemplate: true` = "save as template", otherwise the copy is a regular program.

### Other

Client status already supports PAUSED (shared enum, DTOs and `PATCH /clients/:id`). Paused clients stay accessible, are never flagged "needs attention" and are left out of the queue and KPIs. Demo seed: 5 clients (PAUSED Casey with overrides, low-adherence Riley with auto-approve, lapsed Taylor, Jordan with a pending DELOAD), a pending invite (link printed by the seed), a template program, coach exercises with rpeCap/rep ranges, and a coach override with a note on Alex's squat.

Not done: no resend throttle on verification codes; no per-exercise "duplicate day" endpoint (client-side tree edit).
