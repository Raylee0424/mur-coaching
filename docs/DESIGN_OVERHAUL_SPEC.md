# MUR Coaching: design overhaul spec

Status: ready to execute. Author: design/eng audit, 2026-11-24. Executor: Claude Sonnet, in 4 phases, one commit per phase (more is fine). Do not ask questions; every decision is made below. If something here conflicts with the code, the code's **behaviour** wins and this spec's **styling** wins.

Sources audited:

- `apps/web` at `feat/stitch-match` (`dbb7299`): `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `components/{ui,shell,marketing,clients,progression,engine,exercises,programs,logger,workout-logs,onboarding,charts}/*`, every `app/**/page.tsx`.
- Stitch exports in `~/Downloads/stitch_strength_coaching_platform_landing_page/*/code.html` (15 screens) and `apexmetric_design_system.md`.
- `docs/STITCH_MAP.md`. Note: the map lists `client_today`, `client_active_workout_logger`, `client_history`, `client_lift_detail` and the client bottom sheets, but **those folders are not in the export**. Phase 4 is designed from first principles, not from Stitch.

How to read Stitch: it is a wireframe for information architecture and workflows (what is on screen, in what order, which actions exist). It is **not** the visual target. Its lime accent, pill buttons, Material Symbols CDN, `bolt` logo and equal-weight card grids are explicitly rejected below.

---

## 0. Audit findings

### 0.1 Structural gaps vs Stitch (things Stitch has that the app lacks or does worse)

| # | Gap | Stitch evidence | App today | Fixed in |
| --- | --- | --- | --- | --- |
| G1 | No workspace top bar | `coach_roster_overview`, `coach_progression_queue`: `<header class="h-16 border-b … justify-between">` with page title left, actions right | `PageHeader` is an in-flow `h1` inside a `max-w-5xl` column; nothing pinned | Phase 1 (`PageHeader`, `AppShell`) |
| G2 | Sidebar nav has no icons | Material icons per item (`group`, `tune`, `fitness_center`, `settings`) | `COACH_NAV` is label-only; `NavLink` is a lime pill when active | Phase 1 |
| G3 | No live pending count on the queue nav item | `Progression Queue` item carries `<span … tabular-nums>8</span>` | Nothing | Phase 1 |
| G4 | Workspace is width-capped | Main is `flex-1 p-8`, full width | `AppShell` wraps children in `mx-auto max-w-5xl` (tables scroll horizontally at 1440px) | Phase 1 |
| G5 | Account chip at sidebar bottom | Avatar + name + role chip pinned at bottom | `UserMenu` sits at top of sidebar with kg/lb pill toggle and a full "Sign out" button always visible | Phase 1 |
| G6 | Drawer header and footer are pinned | Why drawer: `header … shrink-0`, scroll body, `footer … shrink-0 bg-surface-container-low` | `Sheet` scrolls the whole `<dialog>`; `WhyDrawer` fakes a sticky footer with `sticky bottom-0 -mx-5 … md:-mx-6`; header scrolls away; every other sheet has its footer inline at the end of the content | Phase 1 (`Sheet`), Phase 3 (callers) |
| G7 | Toast with Undo after accept | Queue: `fixed bottom-6 right-6 … role="status"` with `Undo` button | Queue shows an inline `<p role="status">` line; no undo; Dismiss needs a confirm modal. Other screens each roll their own green `role="status"` banner (`EvaluateAllButton`, `ExerciseLibrary`, `ExerciseForm`, `ProgramBuilder`, `history/page.tsx`) | Phase 1 (`Toast`), Phase 3 |
| G8 | Table density and header treatment | `th`: `px-6 py-3 label-sm uppercase` on `surface-container-low`; rows `py-4` | Each table defines its own `thead`/`td` classes (`RosterTable`, `ProgressionQueue`, `ExerciseLibrary`, `EngineRulesEditor`, `WhyDrawer`, `LiftCard`, auth `EnginePreview`) with drift (`px-3`/`px-4`/`px-5`, `bg-raised` vs none) | Phase 1 (`table.ts`), Phase 3 |
| G9 | Why drawer close is an icon, verdict leads | Close `close` icon; header carries exercise + action badge + "Client · Computed … from 3 sessions" | Close is a raw `✕` glyph in a `rounded-full` 44px button; action badge is a separate row in the body | Phase 1, Phase 3 |
| G10 | Column picker | Roster `view_column` "Columns" popover | **Already built** (`RosterTable.ColumnsMenu`, persisted in `localStorage`). Keep behaviour, restyle only. | Phase 3 |
| G11 | DELOAD colour | Stitch and the app's own landing page use **rose** for DELOAD (`ProgressionEngine.tsx` `tone: 'rose'`, Stitch KPI `text-status-rose`) | In-app `ACTION_META.DELOAD.tone = 'amber'`, `LiftCard.SPARK_COLOR.DELOAD = '#FBBF24'`, `WhyDrawer.WhatIf` uses `text-amber` for DELOAD. Landing uses amber for HOLD while the app uses slate. Three different mappings. | Phase 1 (`ACTION_META` is the single source) |
| G12 | Hard-coded hex in charts | n/a | `Sparkline.tsx` default `#34D399` and last point `#C6FF00`; `LiftCard.tsx` `SPARK_COLOR` hex map | Phase 1 |
| G13 | KPI strip | 4 equal boxed cards | Same 4 boxed cards (`clients/page.tsx` `KpiRow`, `OverviewTab` `Stat`, `ClientHeader` stats) | Phase 1 (`StatStrip`), Phase 3 |

### 0.2 "AI slop" inventory (measured in `apps/web/src`)

| Tell | Count / location | Verdict |
| --- | --- | --- |
| `rounded-full` | 69 uses across 40+ files: every `Button`, `Badge`, `NavLink`, filter chip group (`RosterFilters`, `ProgressionQueue`), search inputs, `OverriddenTag`, unit toggle, sheet close button | Kill except avatars, status dots, spinners and the toggle thumb |
| Neon lime `#C6FF00` as `primary` | `bg-primary` ×20, `text-primary` ×100, `::selection`, active nav pill, every chip, focus ring, `OverriddenTag`, demo banner, logo tile | Replace (see §1.1) |
| Default radius 12px / `rounded-lg` 16px | `borderRadius: { DEFAULT: '12px', md: '12px', lg: '16px' }`; `rounded-lg` ×49 on cards/sections | Replace with 4/6/8/12 scale |
| `font-mono` | **2** uses total (one is the invite URL). Source Code Pro loaded at weight 600 only. Loads, reps, RPE, deltas and dates are set in the sans with `tabular-nums` (34) or the custom `.tabular` class | Deploy mono for all telemetry (§1.3) |
| Raw Unicode as icons | 30 glyphs: `✕` (`Sheet`, `DayCard`, `TrainingCalendar`), `✓ ≈ –` (`WhyDrawer.RuleTrace`), `▲ + ● ▼` (`ActionBadge`, `RosterTable` RPE trend), `✓` (`WorkoutLogger` exercise chips), `→` (queue) | Replace with lucide (§1.5); `→` and `×` in data strings stay as typography inside mono |
| Hand-rolled inline SVG icons | `PasswordInput`, `RosterFilters` search, `RosterTable` columns, `TabBar` (filled paths, 1.8 stroke), `marketing/Icons.tsx` (7 icons incl. filled `BoltIcon`) | Replace with lucide |
| Lightning-bolt logo | `marketing/MarketingNav.tsx` `Logo` = lime tile + `BoltIcon`; reused by auth layout and footer. Sidebar uses a lime dot + "MUR Coaching" | Replace with typographic wordmark |
| Dot-eyebrow pill | `Hero.tsx`: `rounded-full border … <span class="size-1.5 rounded-full bg-primary"/> COACH-CLIENT STRENGTH PLATFORM`; `Section` `Eyebrow` on every section ("Workflow", "Deterministic logic", "Coach workspace") | Delete |
| `01 / 02 / 03` step cards | `HowItWorks.tsx` (`padStart(2,'0')` in 44px muted display) and Hero `SETS` `n: '01'` | Delete the step cards; set numbers in the hero log are real set indices, keep them but in mono at metadata size |
| Marketing filler | "No black-box AI, just transparent strength rules." (`ProgressionEngine` intro and auth layout caption), "Deterministic Strength Progression" footer tagline | Delete |
| Card soup | Landing: 3 equal step cards, 4 equal engine cards, 2 equal role cards, CTA card inside a section. App: KPI cards, Overview stat cards, Settings-used cards in the Why drawer, `ClientHeader` as a card | Replace with tables, stat strips and asymmetric splits |
| Title Case everywhere | "Log Your Sets. Let the Engine Call the Next Weight.", "See MUR Coaching in Action", "Try Live Demo" | Sentence case (§1.6) |
| Glow/shadow | `shadow-2xl shadow-black/50` (nav demo popover, auth preview), `shadow-xl` (columns menu), `backdrop-blur-sm` (sheet scrim) | Remove; elevation = tone + hairline only |

---

## 1. Revised visual system

Direction: **precision instrument, not fitness template.** Near-black neutral surfaces, bone-white type, hairline structure, numbers in mono, one signal colour used for "this needs you / this is focused" and nothing else. References: Linear's density, WHOOP's data hierarchy, Teenage Engineering's orange-on-neutral restraint, a Bloomberg terminal's tables.

### 1.1 Colour

Strategy: **keep the existing token names, remap their values.** This de-limes the whole app in one config change, avoids touching ~250 class usages, and keeps every `bg-x/30` opacity modifier working. Two tokens are added (`signal`, `faint`) and the status tokens get action aliases.

| Token (existing name) | Old | New | Role |
| --- | --- | --- | --- |
| `canvas` | `#0A0C10` | `#0B0B0C` | Page background |
| `canvas-low` | `#0F1219` | `#0F0F11` | Sidebar, table header rows, inset wells, input fill |
| `card` | `#131720` | `#131315` | Panels, sheets |
| `raised` | `#1A1F2B` | `#1A1A1D` | Hover row, selected row, popovers |
| `line` | `#222938` | `#232327` | Hairlines (default border) |
| `line-strong` | `#334155` | `#323238` | Control borders, dividers that must read |
| `ink` | `#F8FAFC` | `#ECEBE7` | Primary text (warm bone, not blue-white) |
| `muted` | `#94A3B8` | `#8B8B91` | Secondary text, labels |
| `faint` (new) | — | `#5D5D64` | Tertiary text, units, disabled, placeholder |
| `primary.DEFAULT` | `#C6FF00` | `#ECEBE7` | **Chalk.** Primary button fill, active text. Same as `ink` on purpose |
| `primary.ink` | `#0A0C10` | `#0B0B0C` | Text on chalk |
| `primary.container` | `#273500` | `#1E1E21` | Former lime-tinted fills (now neutral) |
| `primary.soft` | `#D9FF78` | `#FFFFFF` | Primary hover, link hover |
| `signal` (new) | — | `#FF6A1F` | **The only accent.** Focus ring, live pending count, active-nav indicator bar, selected-row left rule, `::selection`. Never a fill larger than a 20×20 badge. |
| `signal.bg` (new) | — | `#2A1408` | Background behind the pending count only |
| `danger.DEFAULT` / `.bg` | `#FF5449` / `#350B16` | `#F2554C` / `#2A0F0E` | Destructive actions, form errors |
| `emerald.DEFAULT` / `.bg` | `#34D399` / `#062E22` | `#4FBF7F` / `#0E2218` | **INCREASE_LOAD**, positive deltas, "completed" |
| `sky.DEFAULT` / `.bg` | `#38BDF8` / `#082A3F` | `#6AA4E6` / `#0E1A2A` | **INCREASE_REPS** |
| `amber.DEFAULT` / `.bg` | `#FBBF24` / `#332005` | `#D6A23E` / `#251B09` | Needs attention, warnings, RPE above cap. **Not an action colour.** |
| `rose.DEFAULT` / `.bg` | `#FB7185` / `#350B16` | `#E5615A` / `#2A1110` | **DELOAD**, missed sessions |

Action mapping (single source: `ACTION_META` in `components/progression/ActionBadge.tsx`):

| Action | Token | Icon (lucide) | Short label |
| --- | --- | --- | --- |
| `INCREASE_LOAD` | `emerald` | `TrendingUp` | Increase load |
| `INCREASE_REPS` | `sky` | `Plus` | Add reps |
| `HOLD` | `muted` (neutral; badge uses `line-strong` border) | `Equal` | Hold |
| `DELOAD` | `rose` | `TrendingDown` | Deload |

Surface area budget: `signal` ≤ 1% of any screen, action colours ≤ 5%, everything else is `canvas`/`card`/`ink`/`muted`. Primary (chalk) buttons: at most **one** per view region (one in the top bar, one in a sheet footer).

### 1.2 Radius

Replace `borderRadius` entirely (do not `extend`, override the keys used):

```ts
borderRadius: {
  none: '0',
  sm: '4px',      // badges, checkboxes, kbd, calendar day cells
  DEFAULT: '6px', // buttons, inputs, selects, segmented controls, popover items
  md: '8px',      // tables, panels, cards, popovers
  lg: '12px',     // sheets/drawers/modals only
  full: '9999px', // avatars, status dots, spinner, range thumb — nothing else
},
```

Effect on existing classes: `rounded` → 6px, `rounded-md` → 8px, `rounded-lg` → 12px. After Phase 1, every remaining `rounded-lg` on a non-overlay element must be changed to `rounded-md` (grep in §5).

### 1.3 Typography

Fonts (all via `next/font/google`, replacing Plus Jakarta Sans / Instrument Sans / Source Code Pro):

| Role | Family | Load | CSS var |
| --- | --- | --- | --- |
| Display (h1–h3, wordmark, big numbers that are not telemetry) | **Archivo**, variable, with `axes: ['wdth']` | `Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display' })` (no `weight` key: required for `axes`) | `--font-display` |
| Body / UI | **IBM Plex Sans** | `weight: ['400','500','600']` | `--font-body` |
| Telemetry | **IBM Plex Mono** | `weight: ['400','500','600']` | `--font-mono` |

Display headings render semi-condensed: `font-stretch: 87.5%` (set in `globals.css`, §2.2). This is what makes headlines read as "instrument" rather than "SaaS hero".

Type scale (add to `theme.extend.fontSize`; names are new, old arbitrary `text-[11px]` etc. are migrated to these):

```ts
fontSize: {
  'micro':   ['10.5px', { lineHeight: '14px', letterSpacing: '0.06em' }], // mono uppercase labels, th
  'meta':    ['12px',   { lineHeight: '16px' }],                          // secondary lines, captions
  'ui':      ['13px',   { lineHeight: '18px' }],                          // table cells, buttons, nav
  'body':    ['15px',   { lineHeight: '22px' }],
  'title':   ['17px',   { lineHeight: '22px', letterSpacing: '-0.01em' }], // top bar title, panel titles
  'h2':      ['22px',   { lineHeight: '26px', letterSpacing: '-0.015em' }],
  'h1':      ['30px',   { lineHeight: '32px', letterSpacing: '-0.025em' }],
  'display': ['clamp(40px, 6vw, 76px)', { lineHeight: '0.95', letterSpacing: '-0.035em' }], // landing hero only
  'metric':  ['28px',   { lineHeight: '30px', letterSpacing: '-0.02em' }], // mono stat values
  'metric-lg': ['44px', { lineHeight: '44px', letterSpacing: '-0.03em' }], // the one hero number per screen (next target)
},
```

Telemetry rule (non-negotiable): **every** load (`kg`/`lb`), rep count, set count, RPE, percentage, delta (`+2.5 kg`, `−10%`), date/time, week number, rule threshold and count badge is rendered in `font-mono`. Units are a separate `<span className="text-faint">` with no extra space beyond the thin space already produced by `formatWeight`. Minus signs are U+2212 `−` (the code already uses it in places; make it universal for displayed deltas). Use `×` (U+00D7) for sets × reps.

Hierarchy rules:

- Exactly one `h1` per page, in the top bar, `font-display text-title font-semibold` (the top bar title is small on purpose; the content carries the weight).
- The **primary artifact** of a screen gets the largest type on it: next target on Client Today (`metric-lg` mono), proposed load in the Why drawer header strip (`metric` mono), the logged-set stepper values in the logger. Nothing else on that screen may exceed `h2`.
- Labels: `font-mono text-micro uppercase text-muted`. Never pair an uppercase label with a heading that says the same thing (e.g. delete "Session history" `h2` when the tab already reads "History").
- No `font-extrabold` (800) in the app. Display 600–700 only; landing hero may use 700.

### 1.4 Spacing and layout

Keep Tailwind's default spacing scale. Add only:

```ts
spacing: { 'topbar': '56px', 'sidebar': '232px', 'drawer': '560px' },
```

- App workspace: sidebar `w-sidebar`, top bar `h-topbar`, content padding `px-6 py-6` (`md:px-8`), **no max width** on tables/lists. Prose-ish pages (Settings, Notes, Profile, onboarding) self-constrain with `max-w-3xl`.
- Table rows: `h-11` (44px) min; header row `h-9`; cell padding `px-4` (first/last `px-5`).
- Panels: `p-4` (not `p-5`/`p-6`). Section gaps `gap-6`. Landing sections `py-20 lg:py-28`.

### 1.5 Icons

- Install `lucide-react` in `apps/web` (`pnpm --filter web add lucide-react`). Use a version whose `peerDependencies` accept React 19 (any `>=0.469`); check `pnpm why react` shows no peer warning.
- Create `apps/web/src/components/ui/Icon.tsx`:

  ```tsx
  import type { LucideIcon, LucideProps } from 'lucide-react';
  /** Every icon in the app goes through here: 16px, 1.5 stroke, decorative unless labelled. */
  export function Icon({ icon: I, size = 16, label, ...rest }: { icon: LucideIcon; size?: 14 | 16 | 20; label?: string } & Omit<LucideProps, 'size' | 'ref'>) {
    return <I size={size} strokeWidth={1.5} absoluteStrokeWidth aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined} focusable="false" {...rest} />;
  }
  ```
- Import individual icons (`import { Users } from 'lucide-react'`), never the namespace.
- Banned: Material Symbols / any icon CDN `<link>`, raw glyphs used as icons (`✕ ✓ ▲ ▼ ● ≈ ★ ⚡`), filled icon variants, emoji, inline hand-drawn `<svg>` icons (charts are fine).
- Delete `components/marketing/Icons.tsx` at the end of Phase 2 (all consumers migrated).

### 1.6 Copy rules

- Sentence case for headings, buttons, nav, tabs ("Progression queue", "Try the coach demo"). Uppercase only for `text-micro` mono labels.
- Banned words in UI/marketing copy: AI, black-box, seamless, effortless, powerful, unlock, supercharge, revolutionize, next-level, game-changer.
- Numbers beat adjectives: "Reads your last 3 sessions" not "intelligent analysis".
- Never duplicate a label: if the column header says "RPE", cells say `8.0`, not `RPE 8.0` (the code already strips this in places with `.replace('RPE ', '')`; make it consistent).

### 1.7 DO / DON'T

| DO | DON'T |
| --- | --- |
| Separate content with 1px `border-line` hairlines and `divide-y divide-line` | Wrap every group in its own bordered card |
| Use one `StatStrip` (hairline-divided `dl`) for KPIs | Build a grid of 4 identical stat cards |
| Show the action as a 2px left rule in the action colour + small badge | Tint whole cards/rows in the action background |
| Make the primary artifact the biggest thing on screen | Give headings, stats and the artifact equal weight |
| Put numbers in `font-mono` with units in `text-faint` | Mix `tabular-nums` sans with mono for the same kind of value |
| Use `signal` for focus, pending count, active indicator | Use any accent for decoration, icons or headings |
| Segmented controls: `rounded` container, `rounded-sm` segments, `bg-raised` selected | Pill tab groups with a filled accent selection |
| Animate only `opacity`, `transform`, `background-color`, `border-color`, 150ms ease-out (overlays 200ms `cubic-bezier(0.2,0,0,1)`) | `animate-pulse` on content (skeletons only), glow, blur, gradients, shadows |
| Left-align marketing headlines; asymmetric 7/5 or 8/4 splits | Centred hero + centred CTA + 3-up feature grid |
| Respect `prefers-reduced-motion` (disable sheet slide, toast slide) | Motion that runs regardless |

---

## 2. Global primitives and chrome (Phase 1)

All paths relative to `apps/web/`.

### 2.1 `tailwind.config.ts`

Replace the `theme.extend` block with the tokens in §1.1–§1.4. Exact colour object:

```ts
colors: {
  canvas: '#0B0B0C',
  'canvas-low': '#0F0F11',
  card: '#131315',
  raised: '#1A1A1D',
  line: '#232327',
  'line-strong': '#323238',
  ink: '#ECEBE7',
  muted: '#8B8B91',
  faint: '#5D5D64',
  primary: { DEFAULT: '#ECEBE7', ink: '#0B0B0C', container: '#1E1E21', soft: '#FFFFFF' },
  signal: { DEFAULT: '#FF6A1F', bg: '#2A1408' },
  danger: { DEFAULT: '#F2554C', bg: '#2A0F0E' },
  emerald: { DEFAULT: '#4FBF7F', bg: '#0E2218' },
  sky: { DEFAULT: '#6AA4E6', bg: '#0E1A2A' },
  amber: { DEFAULT: '#D6A23E', bg: '#251B09' },
  rose: { DEFAULT: '#E5615A', bg: '#2A1110' },
},
```

`borderRadius` goes in `theme` (override), not `theme.extend`, so the 16px `lg` cannot leak back. `fontFamily` keeps the three CSS variables. Add `transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' }` and keep `transitionDuration: { DEFAULT: '150ms' }`. Update the header comment to `// MUR Coaching tokens (docs/DESIGN_OVERHAUL_SPEC.md §1).`

### 2.2 `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { color-scheme: dark; }
  body {
    @apply bg-canvas text-ink antialiased;
    font-family: var(--font-body), system-ui, sans-serif;
    font-size: 15px;
  }
  h1, h2, h3, .font-display {
    font-family: var(--font-display), system-ui, sans-serif;
    font-stretch: 87.5%;
    letter-spacing: -0.02em;
  }
  .font-mono, table, input[type='number'], output {
    font-variant-numeric: tabular-nums slashed-zero;
  }
  :focus-visible { outline: 2px solid theme('colors.signal.DEFAULT'); outline-offset: 2px; }
  ::selection { background: theme('colors.signal.DEFAULT'); color: theme('colors.canvas'); }
  input[type='checkbox'], input[type='radio'], input[type='range'] { accent-color: theme('colors.ink'); }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  }
}

@layer components {
  /* Kept for back-compat during migration; Phase 4 removes every `.tabular` use. */
  .tabular { font-family: var(--font-mono), ui-monospace, monospace; font-variant-numeric: tabular-nums slashed-zero; }
}
```

Then delete every `focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary` class string across the codebase (the global rule replaces them). Keep `focus-visible:-outline-offset-2` where the element sits flush in a container (tabs, table rows).

### 2.3 `src/app/layout.tsx`

Swap the font imports per §1.3:

```tsx
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
const display = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });
```

Keep `metadata`, but change `description` to `'Coach-built programs. The next weight comes from the last three logged sessions.'`. Add `export const viewport = { themeColor: '#0B0B0C' };`.

### 2.4 New: `src/components/ui/Icon.tsx`

As in §1.5.

### 2.5 `src/components/ui/Button.tsx`

Keep `buttonClass(variant, className)` working; add `size` as a third, optional argument so no call site breaks.

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-soft disabled:bg-raised disabled:text-faint',
  secondary: 'border border-line-strong bg-transparent text-ink hover:bg-raised hover:border-faint disabled:text-faint',
  ghost: 'text-muted hover:bg-raised hover:text-ink disabled:text-faint',
  danger: 'border border-danger/50 text-danger hover:bg-danger-bg disabled:text-faint',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-ui gap-1.5',
  md: 'h-9 px-3.5 text-ui gap-2',
  lg: 'h-11 px-4 text-body gap-2', // phone flows, logger, auth submit
};
export function buttonClass(variant: ButtonVariant = 'primary', className?: string, size: ButtonSize = 'md'): string {
  return clsx('inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-colors disabled:cursor-not-allowed', SIZES[size], VARIANTS[variant], className);
}
```

`Button` gains `size?: ButtonSize`. `SubmitButton` forwards it. Spinner in `SubmitButton`: keep `rounded-full` (allowed), make it `size-3.5 border-[1.5px]`.

Migration rule for call sites: delete `min-h-9 py-1`, `min-h-9 px-3 py-1`, `min-h-11` overrides and pass `size` instead (`'sm'` for in-row table actions, `'lg'` for client/phone and auth forms). `danger` solid fill is gone; destructive confirms use `danger` (outlined) and that is enough.

### 2.6 `src/components/ui/Badge.tsx`

```ts
export type BadgeTone = 'emerald' | 'amber' | 'sky' | 'slate' | 'red' | 'neutral' | 'signal';
const TONES: Record<BadgeTone, string> = {
  emerald: 'border-emerald/35 text-emerald',
  sky: 'border-sky/35 text-sky',
  amber: 'border-amber/35 text-amber',
  red: 'border-rose/35 text-rose',
  slate: 'border-line-strong text-muted',
  neutral: 'border-line-strong text-ink',
  signal: 'border-signal/40 bg-signal-bg text-signal',
};
// base:
'inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-micro uppercase whitespace-nowrap'
```

- Remove `indigo` (only used by `UserMenu`; the role chip is replaced, see §2.11). Map any remaining `indigo` to `neutral`.
- Add an optional `icon?: LucideIcon` prop rendered via `<Icon size={14} />`.
- No background fill except `signal`. Colour is never the only signal (text stays mandatory, keep the doc comment).
- `OverriddenTag` in `ui/OverrideField.tsx` becomes `<Badge tone="neutral" icon={PenLine}>Overridden</Badge>`.

### 2.7 `src/components/ui/Card.tsx`

```tsx
export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-md border border-line bg-card', className)} {...rest} />;
}
/** Panel = Card with a hairline header row. Use for any titled group. */
export function Panel({ title, meta, actions, children, className }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) { … }
```

`Panel` header: `flex h-11 items-center justify-between gap-3 border-b border-line px-4`; title `text-ui font-semibold` (sans, not display); `meta` in `font-mono text-micro text-faint`. Body has **no** default padding (tables go edge to edge); callers add `p-4` for prose. Card loses its default `p-5`: grep every `<Card` and add `p-4` explicitly where content is not a table.

### 2.8 New: `src/components/ui/StatStrip.tsx`

Replaces `KpiRow` (`coach/clients/page.tsx`), `Stat` (`OverviewTab.tsx`) and the stats in `ClientHeader`.

```tsx
export interface StatItem { label: string; value: string; unit?: string; delta?: { text: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } | null; note?: string; emphasis?: boolean }
export function StatStrip({ items, label }: { items: StatItem[]; label: string }) {
  // <dl aria-label={label} class="grid grid-cols-2 border-y border-line md:flex md:divide-x md:divide-line">
  // each: <div class="flex-1 px-4 py-3 first:pl-0 md:first:pl-0">
  //   <dt class="font-mono text-micro uppercase text-muted">{label}</dt>
  //   <dd class="mt-1 font-mono text-metric text-ink">{value}<span class="ml-1 text-ui text-faint">{unit}</span></dd>
  //   <dd class="mt-0.5 font-mono text-meta {deltaTone}">{delta.text}</dd> or <dd class="text-meta text-faint">{note}</dd>
}
```

Tone map: good `text-emerald`, warn `text-amber`, bad `text-rose`, neutral `text-muted`. `emphasis` sets the value in `text-signal` (use only for "Pending recommendations > 0").

### 2.9 New: `src/components/ui/table.ts`

Single source for table density (G8). Plain string constants, no component:

```ts
export const TABLE = 'w-full border-collapse text-left text-ui';
export const THEAD = 'bg-canvas-low';
export const TH = 'h-9 px-4 font-mono text-micro font-normal uppercase text-muted first:pl-5 last:pr-5 whitespace-nowrap';
export const TR = 'border-t border-line transition-colors hover:bg-raised/60';
export const TD = 'h-11 px-4 align-middle first:pl-5 last:pr-5';
export const TD_NUM = `${TD} font-mono text-right whitespace-nowrap`;
export const TH_NUM = `${TH} text-right`;
```

Numeric columns are right-aligned. Every table in the app adopts these (Phase 3/4 list each one).

### 2.10 `src/components/ui/Sheet.tsx` (pinned header/footer, G6/G9)

New props: `footer?: ReactNode`, `headerExtra?: ReactNode` (renders under the title inside the pinned header; used by the Why drawer for its verdict strip), `form?: Omit<ComponentProps<'form'>, 'children'>`.

Structure:

```tsx
<dialog
  ref={ref}
  aria-labelledby={titleId}
  onClose={onClose}
  onClick={…backdrop close, unchanged…}
  className={clsx(
    'max-h-[90dvh] overflow-hidden border border-line bg-card p-0 text-ink backdrop:bg-black/70 open:flex open:flex-col',
    PLACEMENT[variant],
  )}
>
  <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
    <div className="min-w-0">
      <h2 id={titleId} className="text-title font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-meta text-muted">{description}</p> : null}
      {headerExtra}
    </div>
    <button type="button" aria-label="Close" onClick={onClose} className={buttonClass('ghost', 'w-8 px-0', 'sm')}>
      <Icon icon={X} />
    </button>
  </header>
  {/* Body + footer, optionally inside one <form> so SubmitButton's useFormStatus keeps working. */}
  <Wrapper {...(form ?? {})} className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
    {footer ? <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-canvas-low px-5 py-3">{footer}</footer> : null}
  </Wrapper>
</dialog>
```

`Wrapper` is `form ? 'form' : 'div'`.

Critical pitfalls:

1. **Use `open:flex`, never plain `flex`, on the `<dialog>`.** A plain `display:flex` overrides the UA `dialog:not([open]) { display:none }` and closed dialogs render on the page.
2. When a sheet holds a form whose submit is a `SubmitButton`, pass the form through the `form` prop (`form={{ action, id }}`) so body and footer share one `<form>`. Do not move a `SubmitButton` outside its form and do not rely on the `form="id"` attribute: `useFormStatus` only sees the enclosing form.
3. Placement radii: `modal` → `md:rounded-lg`, `drawer` → `md:rounded-none md:border-y-0 md:border-r-0` (flush to the viewport edge, `md:h-dvh md:max-h-dvh md:w-drawer`), `bottom`/mobile → `rounded-t-lg`.
4. Remove `backdrop:backdrop-blur-sm`.
5. Enter motion: add `transition-transform` + `@starting-style` is not reliable across browsers; skip slide animation. Opacity fade only via `open:animate-[fade_200ms]` is optional; do not block on it.

`SheetButton` stays, forwarding `footer`.

### 2.11 `src/components/ui/PageHeader.tsx` becomes the top bar (G1)

The layout cannot know the page title, so the **page's `PageHeader` is the top bar**. It renders pinned at the top of the main column.

```tsx
export function PageHeader({ title, meta, actions, back }: { title: string; meta?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex h-topbar items-center justify-between gap-4 border-b border-line bg-canvas/95 px-6 md:-mx-8 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {back ? <Link href={back.href} aria-label={back.label} className={buttonClass('ghost', 'w-8 px-0', 'sm')}><Icon icon={ArrowLeft} /></Link> : null}
        <h1 className="truncate font-display text-title font-semibold">{title}</h1>
        {meta ? <span className="hidden truncate font-mono text-meta text-faint sm:inline">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
```

- `subtitle` prop is **removed**. Explanatory subtitles ("Your clients, their adherence and what the engine wants you to review.") are filler; delete them. Where the subtitle carried data, pass it as `meta` (e.g. queue: `meta={`${counts.total} pending`}`).
- The negative margins assume the main padding from §2.12 (`px-6 py-6 md:px-8`). Keep those in sync.
- `bg-canvas/95` without blur.

### 2.12 `src/components/shell/AppShell.tsx` (G2–G5)

Server component. New signature: `AppShell({ user, nav, children, badges })` where `badges?: Partial<Record<string, number>>` maps an `href` to a live count.

Layout (md+):

```
┌ aside w-sidebar, sticky top-0 h-dvh, border-r border-line, bg-canvas-low ───┐┌ main flex-1 min-w-0 ─────────────┐
│ h-topbar row: Wordmark                                                       ││ PageHeader (sticky top bar)      │
│ nav: NavLink × n (icon + label + optional count)                             ││ content px-6 py-6 md:px-8, full  │
│ flex-1 spacer                                                                ││ width, no max-w                  │
│ AccountMenu (avatar initials · name · role, opens popover)                   ││                                  │
└──────────────────────────────────────────────────────────────────────────────┘└──────────────────────────────────┘
```

- Remove `<div className="mx-auto max-w-5xl">`. Main becomes `<main className="min-w-0 flex-1 px-6 py-6 md:px-8">`.
- Below `md`: the aside collapses to a `h-topbar` bar (wordmark left, `AccountMenu` right) above a horizontally scrolling icon+label nav strip (`overflow-x-auto`, `border-b`). The client layout still hides this strip on phones in favour of `TabBar` (keep the existing `max-md:[&_nav[aria-label=Main]]:hidden` hook; keep `aria-label="Main"` on the nav).
- `DemoBanner` stays at the very top but restyled (§2.15).
- Wrap `children` in `<ToastProvider>` (§2.14). `ToastProvider` is a client component; passing server children through it is fine.

New file `src/components/shell/Wordmark.tsx` (used by AppShell, marketing nav, footer, auth layout):

```tsx
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      <span className="font-display text-[17px] font-bold tracking-[-0.03em]" style={{ fontStretch: '75%' }}>MUR</span>
      <span className="font-mono text-micro uppercase text-muted">Coaching</span>
    </span>
  );
}
```

No icon, no dot, no tile. Delete `Logo` from `MarketingNav.tsx` and update its importers (`MarketingFooter.tsx`, `app/(auth)/layout.tsx`, `app/(onboarding)/layout.tsx` if it uses it).

**`src/lib/routes.ts`**: `middleware.ts` imports `homeFor`/`onboardingFor` from this file, so it must never import `lucide-react`. Also, `NavLink` and `TabBar` are client components receiving `nav` from server layouts, and component functions cannot cross that boundary. So `NavItem` gains a **string** key: `icon: NavIconKey` where `export type NavIconKey = 'users' | 'queue' | 'dumbbell' | 'calendar-range' | 'sliders' | 'today' | 'history' | 'user'`. New client-side file `src/components/shell/nav-icons.ts` maps keys to lucide components (`users → Users`, `queue → ListChecks`, `dumbbell → Dumbbell`, `calendar-range → CalendarRange`, `sliders → SlidersHorizontal`, `today → CalendarCheck`, `history → History`, `user → UserRound`); `NavLink` and `TabBar` import it. `routes.test.ts` must keep passing.

```ts
export const COACH_NAV: readonly NavItem[] = [
  { href: '/coach/clients', label: 'Roster', icon: 'users' },
  { href: '/coach/progression', label: 'Progression queue', icon: 'queue' },
  { href: '/coach/exercises', label: 'Exercise library', icon: 'dumbbell' },
  { href: '/coach/programs', label: 'Programs', icon: 'calendar-range' },
  { href: '/coach/settings', label: 'Engine rules', icon: 'sliders' },
];
export const CLIENT_NAV: readonly NavItem[] = [
  { href: '/client', label: 'Today', exact: true, icon: 'today' },
  { href: '/client/history', label: 'History', icon: 'history' },
  { href: '/client/profile', label: 'Profile', icon: 'user' },
];
```

Drop the unused `soon` flag (no item sets it) from `NavItem` and `NavLink`.

**`src/components/shell/NavLink.tsx`**: gets `count?: number`.

```
'group relative flex h-9 items-center gap-2.5 rounded px-2.5 text-ui font-medium transition-colors'
active:   'bg-raised text-ink' + an absolutely positioned 2px bar: <span aria-hidden class="absolute inset-y-2 -left-3 w-0.5 rounded-full bg-signal" />
inactive: 'text-muted hover:bg-raised/60 hover:text-ink'
icon:     <Icon icon={item.icon} /> (text-faint when inactive, text-ink when active)
count:    {count ? <span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-signal-bg px-1 font-mono text-micro text-signal">{count}<span class="sr-only"> pending</span></span> : null}
```

`TabBar` must use `item.icon` too (delete its `ICONS` path map; active state = `text-ink` + 2px top bar in `signal`, inactive `text-faint`; icons always outline).

**Live pending count (G3)** in `src/app/(coach)/layout.tsx`:

```tsx
const pending = await progressionApi.queue().then((q) => q.counts.total).catch(() => 0);
return <AppShell user={user} nav={COACH_NAV} badges={{ '/coach/progression': pending }}>…
```

- Uses the existing `GET /progression/recommendations` (default status PENDING). No API change.
- `.catch(() => 0)`: the shell must never fail because the badge failed.
- Freshness: layouts are not re-rendered on soft navigation, only on revalidation. In `src/actions/progression.ts`, add `revalidatePath('/coach', 'layout')` to the shared revalidate helper (line ~18) and to `bulkResolveRecommendations` (both branches) and `evaluateAll`. Nothing else changes in that file.

**`src/components/shell/UserMenu.tsx` → `AccountMenu`** (rename file to `AccountMenu.tsx`, update imports). A `<details>` popover anchored to the sidebar bottom chip:

- Summary: `size-7 rounded-full bg-raised font-mono text-micro` initials + name (`text-ui`) + role (`font-mono text-micro uppercase text-faint`: "Coach"/"Client"). Use `ChevronsUpDown` icon at right.
- Panel (`rounded-md border border-line bg-raised p-1 w-56`, opens upward on desktop): segmented kg/lb control (the same `setWeightUnit` form, segments `rounded-sm h-7 font-mono text-micro`, selected `bg-card text-ink`, other `text-muted`), divider, "Sign out" as a full-width `ghost` `SubmitButton` with `LogOut` icon inside the existing `logout` form.
- Keep both server-action forms exactly as they are (names, values, actions).

### 2.13 `src/components/ui/Field.tsx`, `Chips.tsx`, `PasswordInput.tsx`, `EmptyState.tsx`

- `CONTROL`: `h-9 rounded border border-line-strong bg-canvas-low px-3 text-ui text-ink placeholder:text-faint hover:border-faint aria-[invalid=true]:border-danger` (`h-11 text-body` when a new `size="lg"` prop is passed; client/auth forms use lg). Numeric inputs (`type="number"`, `inputMode="decimal"`) add `font-mono`.
- `Label`: `mb-1.5 block font-mono text-micro uppercase text-muted`.
- `FormError`: `rounded border-l-2 border-danger bg-danger-bg px-3 py-2 text-ui text-danger` (no full border box).
- `Chips` (onboarding multi-select): `h-9 rounded px-3 text-ui border`, on = `border-ink bg-raised text-ink` + `Check` icon, off = `border-line-strong text-muted`. Keep `aria-pressed`. `min-h-12` goes away except when the parent passes `size="lg"`.
- `PasswordInput`: replace the inline SVG with `<Icon icon={shown ? EyeOff : Eye} />`; button `w-9`.
- `EmptyState`: `rounded-md border border-dashed border-line-strong px-6 py-10 text-left` (not centred); title `text-ui font-semibold`, body `text-meta text-muted`, optional `action` prop rendered below.

New: `src/components/ui/Segmented.tsx` for link-based filter groups (replaces the pill groups in `RosterFilters`, `ProgressionQueue`, Why-drawer state). Props: `items: { href: string; label: string; count?: number; current: boolean; icon?: LucideIcon }[]`, `label: string`. Markup: `<nav aria-label>` container `inline-flex h-9 items-center gap-0.5 rounded border border-line bg-canvas-low p-0.5`; each link `h-7 rounded-sm px-2.5 text-ui`, current `bg-raised text-ink`, else `text-muted hover:text-ink`; count in `font-mono text-micro text-faint` after the label. `aria-current="page"` on current.

New: `src/components/ui/SearchField.tsx`: the debounced `?q=` search used by roster and queue is duplicated in `RosterFilters` and `ProgressionQueue`. Extract it: props `value`, `placeholder`, `label`, `hrefFor: (text: string) => string`. Contains the 300 ms debounce + `router.replace` logic moved verbatim, `Search` icon, `h-9 rounded` control, `w-64`.

### 2.14 New: `src/components/ui/Toast.tsx` (G7)

Client component; context provider + hook. No dependency.

```ts
export interface ToastInput { message: string; tone?: 'ok' | 'error' | 'neutral'; action?: { label: string; onAction: () => void }; durationMs?: number /* default 5000; errors 8000 */ }
export function ToastProvider({ children }: { children: ReactNode }): JSX.Element;
export function useToast(): { show: (t: ToastInput) => string; dismiss: (id: string) => void };
```

- Region: `<div role="region" aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 max-md:bottom-20">` (`bottom-20` clears the client `TabBar`). Each toast: `pointer-events-auto flex items-center gap-3 rounded-md border border-line-strong bg-raised px-4 py-3 text-ui` with a 2px left rule in tone colour (`border-l-2 border-l-emerald` / `border-l-danger` / `border-l-line-strong`), message, optional action button (`ghost sm`, `font-medium text-ink underline-offset-2 hover:underline`), close `X` ghost button.
- Live region: wrap the list in `aria-live="polite"`; error toasts additionally `role="alert"`.
- Max 3 visible; newest at the bottom. Pause the timer on hover/focus-within.
- Pure logic (queueing, max 3, timer bookkeeping) lives in `src/components/ui/toast-model.ts` with `toast-model.test.ts` (node env, like the other `*-model.ts` files).

`AppShell` mounts `ToastProvider`. The marketing page, auth and onboarding layouts do not need it.

### 2.15 `src/components/shell/DemoBanner.tsx`

`border-b border-line bg-canvas-low px-4 h-9 text-meta text-muted`; left: `<span class="font-mono text-micro uppercase text-signal">Demo</span> Seeded data. Changes reset nightly.` (only if that is true; otherwise "Seeded data."). Right: "View onboarding" `ghost sm` link and "Switch to coach/client" `secondary sm` `SubmitButton`. Keep the form/action unchanged.

### 2.16 `src/components/progression/ActionBadge.tsx` (G11)

```ts
export const ACTION_META: Record<RecommendationAction, { label: string; icon: LucideIcon; tone: BadgeTone; text: string; rule: string; stroke: string }> = {
  INCREASE_LOAD: { label: 'Increase load', icon: TrendingUp, tone: 'emerald', text: 'text-emerald', rule: 'border-l-emerald', stroke: 'stroke-emerald' },
  INCREASE_REPS: { label: 'Add reps', icon: Plus, tone: 'sky', text: 'text-sky', rule: 'border-l-sky', stroke: 'stroke-sky' },
  HOLD: { label: 'Hold', icon: Equal, tone: 'slate', text: 'text-muted', rule: 'border-l-line-strong', stroke: 'stroke-muted' },
  DELOAD: { label: 'Deload', icon: TrendingDown, tone: 'red', text: 'text-rose', rule: 'border-l-rose', stroke: 'stroke-rose' },
};
```

- `symbol` and `border` keys are removed; update consumers (`RosterTable`, `ProgressionQueue`, `LiftCard`, `WhyDrawer`, `RecommendationCard`, client `action-tone.ts`). `grep -rn "\.symbol\|\.border\b" src` must be empty afterwards.
- `ActionBadge` = `<Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>`.
- `client/_components/action-tone.ts` must derive from `ACTION_META` rather than keep its own mapping (check it; if it defines separate colours, replace them).

### 2.17 `src/components/charts/Sparkline.tsx` and `LineChart.tsx` (G12)

- Replace `color?: string` with `tone?: RecommendationAction | 'neutral'` (default `'neutral'`). Stroke via class: `className={tone === 'neutral' ? 'stroke-muted' : ACTION_META[tone].stroke}` on the `<polyline>`; points `fill-current` with the matching `text-*` class. Last point: `r=3`, `fill-ink` (not lime). Line `strokeWidth={1.5}`, `vectorEffect="non-scaling-stroke"`. Default `height` 32.
- Delete `SPARK_COLOR` from `LiftCard.tsx`; pass `tone={rec.action}`.
- `LineChart.tsx`: same treatment. Grid lines `stroke-line`, axis labels `fill-faint font-mono` at 10.5px, series `stroke-ink` 1.5px, target/proposed point `fill-signal` is **not** allowed; use `fill-ink` with a 1px `stroke-canvas` ring. No hex anywhere in `components/charts`.

### 2.18 Phase 1 file list

Create: `components/ui/Icon.tsx`, `components/ui/StatStrip.tsx`, `components/ui/table.ts`, `components/ui/Segmented.tsx`, `components/ui/SearchField.tsx`, `components/ui/Toast.tsx`, `components/ui/toast-model.ts`, `components/ui/toast-model.test.ts`, `components/shell/Wordmark.tsx`, `components/shell/AccountMenu.tsx` (renamed from `UserMenu.tsx`), `components/shell/nav-icons.ts`.
Modify: `package.json` (lucide-react), `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `components/ui/{Button,Badge,Card,Field,Chips,PasswordInput,EmptyState,OverrideField,Sheet,PageHeader,SubmitButton}.tsx`, `components/shell/{AppShell,NavLink,DemoBanner}.tsx`, `app/(client)/client/_components/TabBar.tsx`, `app/(coach)/layout.tsx`, `lib/routes.ts`, `actions/progression.ts` (revalidate only), `components/progression/ActionBadge.tsx`, `components/charts/{Sparkline,LineChart}.tsx`, `components/clients/LiftCard.tsx` (spark tone only).

At the end of Phase 1, every page must still render (old layouts inside new chrome is acceptable). Fix all type errors caused by removed props (`subtitle`, `symbol`, `border`, `soon`, `color`, `indigo`) in the same phase, with the minimum change: `subtitle` → delete or move data into `meta`.

---

## 3. Screen-by-screen delta plan

Paths are under `apps/web/src/`.

### Phase 2: Marketing landing (`app/page.tsx`, `components/marketing/*`)

Keep **MUR Coaching** branding (never "Ray Coaching", which is the Stitch placeholder). Keep `DemoForms` and its `demoLogin` contract, the `#demo` anchor, `/signup` and `/login` links. Page order in `app/page.tsx`:

`MarketingNav` → `Hero` → `EngineRules` (renamed from `ProgressionEngine`) → `Loop` (replaces `HowItWorks`) → `Workspaces` (replaces `RoleCards`) → `CallToAction` → `MarketingFooter`.

Shared: `Section.tsx`: delete `Eyebrow`. `Section` props become `{ id, title, intro?, aside?, children }`; heading block is a 12-col grid: `h2` in cols 1–5 (`font-display text-h1 lg:text-[40px] lg:leading-[42px] font-semibold`), `intro` in cols 7–12 (`text-body text-muted max-w-prose`). Section: `border-t border-line py-20 lg:py-28`. `CONTAINER` → `mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-12`.

1. **`MarketingNav.tsx`**: `sticky top-0 z-50 h-14 border-b border-line bg-canvas/95`. Left `Wordmark`. Centre anchors (`text-ui text-muted hover:text-ink`): "Engine" `#engine`, "How it works" `#loop`, "Coaches" `#coaches`, "Athletes" `#athletes` (update section ids accordingly). Right: "Sign in" ghost link, then the `<details>` demo menu with summary `buttonClass('primary', …, 'sm')` labelled "Try the demo"; popover `rounded-md border border-line bg-raised p-3 w-64` (no shadow) containing `DemoForms layout="stacked"` and one line of `text-meta text-muted`: "Seeded accounts. No signup." Remove `Logo`.

2. **`Hero.tsx`**: asymmetric `lg:grid-cols-12`, copy `lg:col-span-7`, artifact `lg:col-span-5`, `items-end`, `py-16 lg:py-24`.
   - Delete the eyebrow pill entirely.
   - `h1`: `font-display text-display font-bold text-balance` → **"The next weight, decided by the last three sessions."**
   - Lead (`text-body lg:text-[17px] text-muted max-w-[52ch]`): "Clients log weight, reps and RPE. The engine checks them against your rules and proposes the next load. You accept, edit or dismiss."
   - `DemoForms layout="inline"` (buttons become "Try the coach demo" primary `lg`, "Try the client demo" secondary `lg`; update labels inside `DemoForms.tsx`, keep the forms).
   - Under the buttons, a mono spec line `font-mono text-micro uppercase text-faint`: `3 sessions · 4 calls · per-client overrides`. Facts only.
   - `WorkoutPreview` (the artifact) is restyled as an instrument panel, not a floating card: `rounded-md border border-line bg-card`. Header row `h-10 border-b px-4`: left `font-mono text-micro uppercase text-muted` "Back squat · Session 3 of 3", right `font-mono text-micro text-faint` "Nov 20". Table using `table.ts` constants: columns Set / Load / Reps / RPE, set numbers `1 2 3` (not `01`), values mono, RPE `8.0`. Footer strip `border-t border-line border-l-2 border-l-emerald px-4 py-3`: line 1 `ActionBadge INCREASE_LOAD` + mono `157.5 kg × 5` in `text-metric`; line 2 `text-meta text-muted` "Avg RPE 7.8 over 3 sessions, under the 8.5 cap." Remove the fake Accept/Dismiss pills (illustration buttons pretending to be interactive). Delete the `CheckCircleIcon` import.

3. **`ProgressionEngine.tsx` → `EngineRules.tsx`** (id `engine`): title "Four possible calls. Every one is traceable." Intro: "The engine evaluates rules in a fixed order and stops at the first match. Coaches set the thresholds; the defaults are below."
   - Replace the 4 equal cards with **one table** (`table.ts`): columns Call | Fires when | Next session. Rows in engine evaluation order **as defined in `components/engine/rule-meta.ts`** with conditions rendered from `RULE_META[*].condition(ENGINE_DEFAULTS)` (import `ENGINE_DEFAULTS` from `@coaching/shared`). Do not hand-write thresholds; the landing page must match the engine.
   - Each row: first cell = `ActionBadge`, row has `border-l-2` in `ACTION_META[a].rule`. "Next session" column mono: `+2.5 kg`, `+1 rep`, `same load`, `−10%` (derive increment/percent from `ENGINE_DEFAULTS` where available).
   - Remove the `TONES` map (DELOAD was rose here and amber in-app; `ACTION_META` now decides).

4. **`HowItWorks.tsx` → `Loop.tsx`** (id `loop`): title "One loop per session." No intro. Replace the three numbered cards with a single horizontal sequence (`lg:grid-cols-3`, `divide-x divide-line` on lg, `divide-y` on mobile, wrapped in one `border-y border-line`). Each step: verb heading `text-ui font-semibold` ("Client logs", "Engine evaluates", "Coach decides"), one sentence `text-meta text-muted`, then a mono artifact line `font-mono text-ui text-ink mt-4`:
   - `155 kg × 5 @ 8.0`
   - `avg RPE 7.8 < cap 8.5 → increase load`
   - `accepted · 157.5 kg × 5 next`
   Between steps on lg, an `ArrowRight` icon `text-faint` absolutely positioned on the divider. No `01/02/03`.

5. **`RoleCards.tsx` → `Workspaces.tsx`**: two sections, not two equal cards.
   - `#coaches` (`lg:grid-cols-12`): text `col-span-4` (h2 "For coaches", 3 plain lines separated by hairlines: "Roster with adherence and needs-attention flags", "A queue of every pending call, bulk accept", "Per-client and per-exercise rule overrides"), preview `col-span-8`: `RosterQueuePreview` restyled as a dense queue table (Client / Lift / Current → Proposed / Call), using `table.ts` and `ActionBadge`, no buttons.
   - `#athletes` mirrored (`col-span-4` text right, `col-span-5` preview left, rest empty): `SetLoggerPreview` restyled as a 360px-wide phone-width panel: exercise name, target line mono, three stepper readouts (Load/Reps/RPE) with `text-metric` mono values, a full-width primary "Log set" (static, `aria-hidden`).
   - Delete `CheckCircleIcon`, `DashboardIcon`, `PhoneIcon`, `ReplayIcon` usage.

6. **`CallToAction.tsx`**: no inner card. `border-t border-line py-20`, `lg:grid-cols-12`: h2 "See it with real numbers." (`col-span-6`), right `col-span-6 flex justify-end gap-3`: "Launch demo" primary `lg` (`#demo`), "Create account" secondary `lg`, "Sign in" ghost `lg`. Remove `ArrowRightIcon`.

7. **`MarketingFooter.tsx`**: `border-t border-line h-14`, `Wordmark` + `font-mono text-micro text-faint` "© 2026", links right. No tagline.

8. Delete `components/marketing/Icons.tsx` once nothing imports it.

Mobile (`<lg`): everything single column, hero `text-display` clamps to 40px, tables in `overflow-x-auto` with `min-w-[36rem]`. The Stitch mobile landing is IA reference only.

### Phase 3: Coach workspace

Every coach page: `PageHeader` is the top bar (Phase 1). Use `Panel`, `StatStrip`, `table.ts`, `Segmented`, `SearchField`, `useToast`. Order of work below.

#### 3.1 Roster: `app/(coach)/coach/clients/page.tsx`, `components/clients/{RosterTable,RosterFilters,PendingInvites,InviteClientModal,RestoreClientButton}.tsx`

- `PageHeader title="Roster" meta={`${counts.ACTIVE} active`} actions={<InviteClientModal templates={templates} />}`. Delete the subtitle.
- Replace `KpiRow` with `<StatStrip label="Roster summary" items=[…]>`: Active clients, Pending calls (`emphasis` when > 0, note "across N lifters"), Sessions logged · 7d, Deloads flagged (value in `text-rose` when > 0: add a `valueClass` escape hatch on `StatItem` only if needed; otherwise `delta.tone='bad'` with text "awaiting review"). Delete the `KpiRow` function.
- Toolbar row (`flex items-center justify-between gap-3 mb-3`): left `Segmented` (All / Needs attention / Paused / Archived-if-any, from `rosterChips`) + `SearchField` (`hrefFor={(t) => rosterHref(filter, t)}`); right `ColumnsMenu`. `RosterFilters` shrinks to composing those two primitives; keep `rosterChips` exported (it is tested).
- `RosterTable`: drop the "Client roster" `h2` + "Showing N of M" header (the strip and segmented counts already say it). Put "Showing N of M" as `font-mono text-micro text-faint` in a `tfoot` row instead. Table in `rounded-md border border-line overflow-hidden`, `table.ts` constants, `min-w-[56rem]`.
  - Client cell: name `text-ui font-medium` (link to detail: the whole name is the link; remove the separate "Open" button column; archived rows keep `RestoreClientButton` in a trailing actions cell that only renders for archived rows). Email below in `text-meta text-faint`. Status badge (non-active) inline after name. Attention reasons: one `Badge tone="amber" icon={AlertTriangle}` showing the first reason, `+N` mono if more, full list in `title`.
  - Last session: mono date. Program: name + `font-mono text-faint` `W3`. Adherence: mono, right-aligned, colour by threshold (keep `adherenceTone`). Pending: mono counts per action using `ACTION_META[a].icon` at 14px + number, coloured `ACTION_META[a].text`; `0` → `text-faint`. RPE trend: mono value + `ArrowUp`/`ArrowDown` 14px icon (replaces `▲▼`), amber up / emerald down, keep the sr-only sentence.
  - Row `hover:bg-raised/60`; entire row is not clickable (only the name link) to keep a11y simple.
- `ColumnsMenu`: trigger `secondary sm` with `Columns3` icon; popover `rounded-md border border-line bg-raised p-1 w-52`, items `h-8 px-2 rounded-sm hover:bg-card` with checkbox. Remove `shadow-xl`. Behaviour and `localStorage` key unchanged.
- `PendingInvites`: becomes a `Panel title="Pending invites" meta={`${n}`}` with a `table.ts` table (Email / Program / Start / Expires / actions). Expired rows `text-faint` with `Badge tone="slate"`. Copy-link action uses `Copy` icon button and shows a toast "Invite link copied".
- `InviteClientModal`: trigger `primary sm` with `UserPlus` icon, label "Invite client". Use `Sheet` `footer` + `form` props. Success state: invite URL in a mono read-only input with a `Copy` icon button, plus toast on copy.
- Empty roster state (`nobody`): `EmptyState` left-aligned with title "No clients yet", body "Invite an athlete, assign a program, and the engine starts after their first logged sessions." and the invite button as `action`.

#### 3.2 Progression queue: `app/(coach)/coach/progression/page.tsx`, `components/progression/{ProgressionQueue,queue-model}.ts(x)`

- `PageHeader title="Progression queue" meta={`${counts.total} pending`}`; actions: the bulk button (moved from the toolbar) `primary sm` "Accept selected" + mono count, disabled at 0.
- Toolbar: `Segmented` with action filters (icon from `ACTION_META`, label, mono count) + `SearchField`. Delete the inline `<p role="status">` line.
- Table (`table.ts`, `min-w-[60rem]`): columns ☐ | Client | Exercise | Current | Proposed | Call | Reason | actions. Split the old "Client / exercise" and "Current → proposed" combined cells into separate columns (Stitch layout, better scanning).
  - Current: mono `155 kg × 5`, `text-muted`. Proposed: mono, `ACTION_META[action].text`, `font-medium`. No `→` glyph needed once they are separate columns.
  - Selected row: `bg-raised` + `shadow-[inset_2px_0_0_theme(colors.signal.DEFAULT)]` (the 2px signal rule). Checkbox `size-4 rounded-sm`.
  - Reason: `text-meta text-muted line-clamp-2 max-w-[22rem]`, full text in `title`.
  - Actions: `ghost sm` "Why" (`Info` icon + label), `secondary sm` "Accept" (`Check`), `ghost sm` icon-only "Dismiss" (`X`, `aria-label` kept). Primary (chalk) is reserved for the bulk action in the top bar.
- **Undo (G7) without API changes.** There is no un-resolve endpoint, so undo = deferred commit:
  1. On Accept/Dismiss (single or bulk), add the ids to a local `hidden` set (rows disappear immediately), show a toast: "Accepted 2 calls" / "Dismissed Marcus Vance · Back squat" with action "Undo", duration 5000 ms.
  2. Schedule `bulkResolveRecommendations(ids, status)` for when the toast expires. Undo cancels the timer and removes the ids from `hidden`.
  3. Flush (commit immediately) any scheduled commits on component unmount and on `pagehide`. On commit failure: un-hide the rows and show an error toast with the server message.
  4. Put the pure state transitions in `queue-model.ts` (`schedule`, `cancel`, `flushAll`, `visibleItems(items, hidden)`) with tests in `queue-model.test.ts`. Timers stay in the component.
  5. Remove the Dismiss confirm `Sheet` (undo replaces confirmation).
- Empty states: filtered → `EmptyState` "No calls match" with "Clear filters" link; clear queue → "Queue is clear" + `text-meta` "New calls appear after clients log sessions." (drop the "re-run the engine" instruction unless the button exists on this page).

#### 3.3 Why drawer: `components/progression/{WhyDrawer,WhyThisCall,EditTargetButton}.tsx`

Use the new `Sheet` (`variant="drawer"`, `headerExtra`, `footer`).

- Pinned header: `title` = exercise name; `description` = `{client} · computed {date} from {n} sessions` (dates mono via a `<span className="font-mono">`; `description` accepts `ReactNode`, widen its type in `Sheet`). `headerExtra` = verdict strip: `mt-3 flex items-end justify-between border-t border-line pt-3` with `ActionBadge` on the left and on the right `font-mono text-muted text-ui` last load, `ArrowRight` icon `text-faint`, proposed load in `font-mono text-metric` coloured `ACTION_META[action].text`. This removes the separate `ActionBadge` row and moves "1. Engine verdict"'s headline numbers into the pinned header. The verdict section body keeps only the reason sentence and "Auto-approved by your rules".
- Section titles: drop the `1.`–`6.` numbering (Stitch's ordinal prefixes are boilerplate). `SectionTitle` → `font-mono text-micro uppercase text-muted` with a `border-b border-line pb-2 mb-3`. Sections separated by `space-y-8`, no boxed backgrounds.
- Override notice: `border-l-2 border-l-ink bg-raised px-3 py-2 text-ui` with `PenLine` icon; "Reset to engine" `ghost sm`.
- Inputs table: `table.ts`, all numeric columns mono right-aligned; computed line in `tfoot` `font-mono text-meta text-faint`.
- Rule trace: an ordered list with hairlines, not boxes. Each row `grid grid-cols-[20px_1fr_auto] gap-3 py-2.5 border-t border-line`: icon (`CircleCheck` `text-emerald` matched, `CircleDashed` `text-muted` also-true, `Minus` `text-faint` not triggered), label `text-ui font-medium` + condition `text-meta text-muted` (thresholds inside the condition string stay sans; fine), result right `font-mono text-micro uppercase` ("Matched" emerald / "Also true" muted / "No" faint) + observed value mono. The matched row gets `bg-emerald-bg/40` only (no border box).
- Settings used: replace the 6 boxed cells with a 2-column `dl` list: label `text-meta text-muted`, value `font-mono text-ui`, source `font-mono text-micro uppercase text-faint` right-aligned; `divide-y divide-line`. "Edit rules" link `ghost sm` with `ArrowUpRight`.
- What-if: two labelled ranges in one `rounded-md border border-line p-4` (this is the one interactive tool, a container is justified). Values mono. Result line mono; tone from `ACTION_META[action].text` (fixes `text-amber` for DELOAD).
- History: vertical timeline `border-l border-line pl-4`, dots `size-1.5 rounded-full` (`bg-ink` override, `bg-line-strong` call), timestamps mono.
- Pinned footer (via `footer` prop): left "Dismiss" `ghost`; right "Edit target" `secondary`, "Accept" `primary`. Delete the `sticky bottom-0 -mx-5 …` footer hack. When the drawer is opened from the queue, Accept/Dismiss should use the queue's deferred-commit path (pass optional `onResolve?: (status) => void` from `ProgressionQueue`; when present, call it and close instead of calling `recommendationAction` directly). When opened from `LiftCard` (no `onResolve`), keep the current direct action and show a toast on success.
- Loading skeleton: three `rounded-md bg-raised animate-pulse` blocks (the only allowed `animate-pulse`).
- `EditTargetButton.tsx` / `EditTargetDialog`: `Sheet` modal with `form` + `footer`; inputs `font-mono`; show "Engine proposed: 157.5 kg × 5" as a mono reference line above the inputs.
- `WhyThisCall.tsx` (client audience bottom sheet, also used on coach `LiftCard`): adopt the same section styles; no footer for clients.

#### 3.4 Client detail: `app/(coach)/coach/clients/[clientId]/page.tsx`, `components/clients/{ClientHeader,ClientTabs,OverviewTab,LiftsTab,LiftCard,TrainingCalendar,NotesTab,ClientSettingsDrawer}.tsx`

- `ClientHeader` stops being a card and stops rendering an `h1`. The page renders `PageHeader title={client.name} back={{ href: '/coach/clients', label: 'Back to roster' }} meta={program · W3/12} actions={<ClientSettingsDrawer …/>}`. `ClientHeader` becomes the strip under it: status badge, email (`text-meta text-muted`), program line, then `StatStrip` (Adherence · 28d, Weekly volume, Pending calls with `emphasis`). Remove the 56px lime initials avatar.
- `ClientTabs`: keep link-tabs; style `h-10 border-b border-line`, tab `px-3 text-ui`, active `text-ink` + `shadow-[inset_0_-2px_0_theme(colors.ink)]` (chalk underline, not lime), inactive `text-muted`. Add a mono count after "Lifts" when pending > 0 (pass `pending` prop).
- `OverviewTab`: replace the 4 `Stat` cards with `StatStrip` (Adherence, Weekly volume, Avg RPE · 7d with `note` "cap 8.0" mono, Streak). Delete `Stat`. Two-column `lg:grid-cols-[minmax(0,1fr)_320px]`: `TrainingCalendar` in a `Panel`; "Needs attention" as a `Panel` whose rows are `divide-y` list items (title `text-ui`, detail `text-meta text-muted`, "Review" `ghost sm` link with `ArrowRight`). Count in `Panel meta` (mono), not a pill. Empty program state: `EmptyState` with action "Assign a program".
- `TrainingCalendar`: day cells `rounded-sm`, `aspect-square`, date number mono `text-micro` top-left. Status via lucide icon at 14px: `Check` (completed, `text-emerald`), `X` (missed, `text-rose`), `Flame` or `Gauge` (HIGH_RPE, `text-amber`), today = `ring-1 ring-inset ring-ink` (not a lime dot). Legend uses the same icons. Month nav `ghost sm` icon buttons `ChevronLeft/Right`, month label mono.
- `LiftsTab` + `LiftCard`: the primary artifact of this tab. `LiftCard` → `rounded-md border border-line border-l-2 ${ACTION_META.rule} bg-card`, no `opacity-90` for resolved (use a `Badge tone="slate"` status instead). Layout `grid lg:grid-cols-[minmax(0,1fr)_280px]`:
  - Left: header row (exercise `text-title font-semibold`, current `font-mono text-meta text-muted` "155 kg × 5 · cap 8.5"), the last-3 table (`table.ts`, compact `h-9` rows), sparkline (`tone={rec.action}`) with mono delta caption.
  - Right column, separated by `border-l border-line pl-4`: label "Next session" `font-mono text-micro uppercase text-muted`, target in `font-mono text-metric` (`ACTION_META.text`), `ActionBadge`, reason `text-meta`, override note if any (`border-l-2 border-l-ink pl-3 text-meta`), then actions stacked: Accept `secondary sm`, Edit target `ghost sm`, Why `ghost sm`, Dismiss `ghost sm` icon.
  - `RecommendationActions.tsx`: show toasts on success instead of inline messages (check its current feedback and migrate).
- History tab: remove the "Session history" `h2` (the tab says it). Pagination buttons `secondary sm`.
- `NotesTab`: `max-w-3xl`, textarea `font-body text-body` `rounded border-line-strong bg-canvas-low`, save status as toast.
- `ClientSettingsDrawer`: `Sheet variant="drawer"` with `form` + pinned `footer` (Cancel ghost / Save primary). Sections divided by hairlines with mono micro titles; pause/archive in a final "Status" section using `danger` outlined buttons. Overrides show the `OverriddenTag` badge.

#### 3.5 Exercise library: `app/(coach)/coach/exercises/page.tsx`, `components/exercises/{ExerciseLibrary,ExerciseFilters,ExerciseForm}.tsx`

- `PageHeader title="Exercise library" meta={`${count} exercises`} actions={New exercise primary sm with Plus}`.
- Toolbar: `ExerciseFilters` → `Segmented` for muscle group (or `Select` if > 6 groups) + `SearchField`-style input (it may filter client-side; keep its current mechanism).
- Table (`table.ts`, `min-w-[56rem]`): Name (+ "Global" `Badge tone="slate"` for non-owned), Muscle, Increment (mono `+2.5 kg`), RPE cap (mono), Rep range (mono `5–8`), Overrides (mono count, `text-faint` at 0), actions (`ghost sm` icon buttons: `Pencil` edit, `Copy` duplicate, `Archive` archive, each with `aria-label`). Inherited rule values render `text-faint` with `title="Inherits engine rule"`; set values `text-ink`.
- Delete the inline `role="status"` notice; use toasts ("Duplicated as Back squat (copy)", "Archived Front squat"). Archive confirm sheet stays (archiving is not undoable via API) but uses `footer`.
- `ExerciseForm` drawer: `Sheet` `form` + `footer`. Numeric fields mono. Remove its inline success `<p role="status">`.

#### 3.6 Program builder: `app/(coach)/coach/programs/{page,new/page,[programId]/page}.tsx`, `components/programs/{ProgramBuilder,DayCard,ExercisePicker,AssignProgramButton}.tsx`

- Programs list page: table, not cards (Name, Weeks mono, Days/week mono, Assigned clients mono, Template badge, actions). Header action "New program".
- `ProgramBuilder`: two-pane layout on lg: left 240px week rail (`W1 … W12` mono list, current `bg-raised` + signal rule, "Add week" ghost) and right day grid. The program meta form (name, weeks, template toggle) moves into a slim `Panel` at the top, fields inline in one row on lg.
- `DayCard`: `Panel title="Day 1 · Lower" actions={Duplicate day ghost sm icon, Delete ghost sm icon}`. Exercise rows `divide-y`: drag/position number mono `text-faint`, exercise name `text-ui`, prescription inputs inline mono `h-8 w-16` (sets × reps-min–reps-max @ weight), remove `X` ghost icon button (replaces `✕`). "Add exercise" `ghost sm` with `Plus` opens `ExercisePicker`.
- `ExercisePicker`: `Sheet` with search input + list rows `h-10`, muscle group mono micro at right; selected `Check` icon. Remove `rounded-full` chips (use `Segmented` for group filter).
- Save feedback: toast (delete the inline emerald banner at `ProgramBuilder.tsx:212` and the "saving" status span → `SubmitButton` pending label covers it). Delete confirm stays (irreversible) with `footer`.
- `AssignProgramButton`: `Sheet` `form` + `footer`; the amber warning box → `border-l-2 border-l-amber bg-amber-bg px-3 py-2 text-ui`.

#### 3.7 Engine rules: `app/(coach)/coach/settings/page.tsx`, `components/engine/{EngineRulesEditor,PreviewLine,rule-meta}.ts(x)`

- `PageHeader title="Engine rules"`. Content `max-w-4xl`.
- Remove the lime-tinted intro `Card` (`border-primary/30 bg-primary-container/30`). Replace with a 2-line `text-meta text-muted` paragraph above the table: "Rules run top to bottom; the first match decides. Client and exercise overrides take precedence over these."
- Rules table (`table.ts`): Order (mono `1–4`), Call (`ActionBadge`), Condition (`text-meta`, thresholds rendered mono by splitting the template; if that is invasive, leave sans), Values (mono list), actions `ghost sm` "Edit". This is the canonical rule table that the landing page also renders (same `RULE_META`).
- Global values (`rpeCap`, increments, sessions, deload %) as a `dl` list in a `Panel title="Defaults"` with mono values and "Edit" ghost buttons; overridden-from-default values get `OverriddenTag`.
- `PreviewLine`: `rounded-md border border-line bg-canvas-low p-3 font-mono text-ui`; action word coloured via `ACTION_META.text`.
- Edit rule `Sheet`: `form` + `footer`.

#### 3.8 Phase 3 sweep

After screens: `grep -rn "role=\"status\"" src/components src/app` and convert every success/info message that is not a form-field status into a toast. Keep: loading statuses, `RestTimer` sr-only live region, logger sr-only announcer, `aria-live` previews.

### Phase 4: Client workspace, auth, onboarding

The client surface is phone-first. Use `size="lg"` buttons and inputs throughout `app/(client)/**` and `components/logger/**`.

#### 4.1 Client Today: `app/(client)/client/page.tsx`, `_components/{Greeting,WhyButton,action-tone,today-model}.ts(x)`

- `PageHeader title="Today" meta={date mono}`. Delete the in-page `header` with `Greeting` `h1` (Greeting text, if kept, becomes one `text-meta text-muted` line under the top bar; prefer deleting it).
- `READY` state, primary artifact first: workout name `text-title`, `font-mono text-micro uppercase text-faint` "Week 3 · Day 2". Then the exercise list as a hairline list (`divide-y border-y`), each row:
  - exercise name `text-ui font-medium` + source line `text-meta text-faint` ("Coach override", "Engine: increase load", "Last session", "Baseline": from `today-model`).
  - target right-aligned in `font-mono text-[20px]` (`ACTION_META.text` when the source is an engine call, `text-ink` otherwise): `157.5 kg × 5`, sets as `3 ×` prefix in `text-faint`.
  - a `WhyButton` as `ghost sm` icon (`Info`) when `recommendationId` exists.
- The first exercise's target uses `text-metric-lg` (the one hero number per screen) in a top block above the list: "First up" micro label, exercise, big target.
- "Start session" primary `lg` full-width, sticky at the bottom above the `TabBar` (`sticky bottom-20 md:static`).
- Target-changed `banner`: `border-l-2 ${ACTION_META.rule} bg-card px-4 py-3`, text `text-ui`, approver `text-meta text-muted`, "Why" `ghost sm`. Delete the tinted `tone.box` full-border box.
- `WEEK_COMPLETE` and `NO_PROGRAM`: `EmptyState` (left-aligned) with concrete copy ("All 4 sessions this week are logged." / "Your coach hasn't assigned a program yet."). Drop "Nice work."
- `WhyButton` bottom sheet: same section styling as §3.3, client-facing copy, no footer.

#### 4.2 Logger: `app/(client)/client/log/page.tsx`, `components/logger/{WorkoutLogger,Stepper,LoggedSets,RestTimer,RpeGuide,SwapExerciseButton,SessionComplete}.tsx`

- Header: `PageHeader title={workoutName} back={{ href: '/client', label: 'Back to today' }}` + `meta` "2 / 5 exercises" mono.
- Exercise strip (`WorkoutLogger.tsx:254`): segmented horizontal scroller, items `h-9 rounded-sm px-3 text-ui`, current `bg-raised text-ink` + 2px signal underline, done items get a `Check` icon (replaces `✓ `).
- Set entry panel (the primary artifact): no card border; `Stepper` readouts are the biggest type on the screen: value `font-mono text-metric-lg`, unit `text-faint text-ui`, label micro mono above. +/− buttons `secondary lg` square `size-11` with `Minus`/`Plus` icons. RPE stepper gets an `RpeGuide` `ghost sm` `CircleHelp` trigger.
- Target line above steppers: `font-mono text-ui text-muted` "Target 157.5 kg × 5 @ ≤ 8.5".
- "Log set" primary `lg` full width. After logging: toast is **not** used here (the set appears in `LoggedSets`; the sr-only announcer stays).
- `LoggedSets`: `table.ts` with compact rows; set number mono `text-faint`; edit via row tap → existing `SetEditorSheet`/`EditSetButton`.
- Swap banner (`WorkoutLogger.tsx:315`): `border-l-2 border-l-sky bg-card px-3 py-2 text-meta` "Swapped from Back squat", Undo as `ghost sm` (local undo already exists; keep `undoSwap`).
- `RestTimer`: mono `text-metric`, progress as a 2px bar `bg-ink` on `bg-line` (not a ring), `rounded-full` allowed on the bar ends only.
- `SessionComplete`: list of next targets as the hairline list from §4.1 with deltas mono (`+2.5 kg` emerald, `−10%` rose). No confetti, no celebration copy beyond "Session logged."
- `SwapExerciseButton` sheet: rows `h-12`, alternative's last top set mono at right.

#### 4.3 History and lift detail: `app/(client)/client/history/page.tsx`, `app/(client)/client/lifts/[exerciseId]/page.tsx`, `components/workout-logs/*`

- History: `PageHeader title="History"`. `HistorySessions`/`WorkoutLogList`: one row per session (`divide-y`): date mono left column `w-20`, workout name, set count + volume mono right. Expand to `WorkoutLogCard` showing sets via `SetLine` (mono). Saved-confirmation banner (`history/page.tsx:62`) → toast triggered by the existing search param on mount (client component helper), or delete if redundant.
- Lift detail: `PageHeader title={exerciseName} back={…History}`. `StatStrip` (Best top set, Last top set, Sessions, Avg RPE · 4 wk). `TrendChart`/`LineChart` full-width in a `Panel`, then the sessions table (`table.ts`). Current target block reuses the §4.1 row style.
- `EditSetButton`/`SetEditorSheet`: `Sheet` `form` + `footer`, mono inputs.

#### 4.4 Profile: `app/(client)/client/profile/page.tsx`

`max-w-2xl`, `dl` hairline list (Name, Email, Coach, Program, Units with the same segmented kg/lb form as `AccountMenu`). Sign out `secondary lg` at the bottom (phones have no sidebar).

#### 4.5 Auth: `app/(auth)/layout.tsx`, `app/(auth)/*/page.tsx`, `components/shell/auth/*`, `components/shell/LoginPanels.tsx`

- Layout `lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`. Left: `Wordmark` top-left, form column `max-w-sm` vertically centred, footer line `font-mono text-micro text-faint` "© 2026 MUR Coaching" (delete "Deterministic Strength Progression").
- Right `aside`: keep `EnginePreview` but restyle it exactly like the hero artifact (§Phase 2.2), no `shadow-2xl`, no floating `bg-raised` card, no `figcaption` filler. `bg-canvas-low border-l border-line`.
- `AuthHeading`: h1 `font-display text-h1 font-semibold`, sub `text-body text-muted`. Remove any pill/eyebrow (`AuthHeading.tsx` has one `rounded-full`).
- Forms (`SignInForm`, `SignupForm`, `ForgotForm`, `ResetForm`, `InviteForm`, `VerifyForm`): `lg` controls, primary submit full width. `VerifyForm` 6-digit input: six `size-12 rounded border-line-strong font-mono text-[22px]` cells (or one mono input with `tracking-[0.5em]` if it is a single input today; keep the current input mechanism).
- `PasswordMeter`: 4 segments `h-1 rounded-sm`, colours rose → amber → emerald; label mono micro.
- `login/page.tsx:20` lockout notice → `border-l-2 border-l-amber bg-amber-bg px-3 py-2 text-ui`.
- `LoginPanels` (demo sign-in panels): two `secondary lg` rows with role label + mono `demo` badge; no cards.

#### 4.6 Onboarding: `app/(onboarding)/layout.tsx`, `components/onboarding/{Stepper,CoachOnboarding,ClientOnboarding,InviteStep}.tsx`

- Layout: `Wordmark` top bar `h-topbar border-b`, content `max-w-2xl mx-auto py-10`.
- `Stepper`: replace pills/grid with a mono step rail: `Step 2 / 4` micro label + 4 `h-0.5` segments (`bg-ink` done/current, `bg-line` todo) + step titles below on md. Remove `rounded-full`.
- Step h1 `font-display text-h1 font-semibold` (no extrabold). Navigation footer: Back `ghost lg`, Continue `primary lg`, right-aligned, `border-t border-line pt-4`.
- `ClientOnboarding` baseline inputs: mono `output`s at `text-metric`; `Chips` per §2.13.
- `InviteStep` success: `border-l-2 border-l-emerald bg-card` + mono URL + copy button (toast on copy is not available outside `AppShell`; use an inline `Copied` text swap for 2 s here).

#### 4.7 Phase 4 sweep

- Remove every `.tabular` class use (replace with `font-mono`), then delete `.tabular` from `globals.css`.
- Run the greps in §5.2 and clear every hit.

---

## 4. Constraints

- **Server/client boundaries.** Do not add `'use client'` to any file that does not have it today, except the new `Toast.tsx`, `Segmented.tsx` (only if it needs `usePathname`; it should not: it receives `current`), `SearchField.tsx`, `AccountMenu.tsx` only if `<details>` is insufficient (it is sufficient: keep it a server component). `AppShell`, `PageHeader`, `Card`/`Panel`, `StatStrip`, `Badge`, `Button`, `Icon`, `Wordmark`, `table.ts` stay server-compatible. Pages stay async server components. Do not pass functions or `LucideIcon` components from server to client components as props. Nav icons cross the boundary as string keys (§2.12, `nav-icons.ts`). The same applies to `Segmented` items rendered inside client components (`ProgressionQueue`, `RosterFilters`): pass the icon component only when the parent is itself a client component that imported it.
- **Auth.** httpOnly cookie session (`lib/session.ts`, `lib/auth.ts`, `middleware.ts`) is untouched. No token in client code. `requireUser` calls stay in every layout/page that has them.
- **API contracts.** `lib/api/endpoints.ts`, `lib/api/client.ts`, `packages/shared` and `apps/api` are not modified. All new data needs (pending count) use existing endpoints. Server actions in `src/actions/*` keep their signatures; the only allowed change is adding `revalidatePath` calls (§2.12).
- **Behaviour preserved.** URL-driven filters (`?filter=`, `?action=`, `?q=`, `?tab=`, `?month=`, `?cursor=`), the roster column picker's `localStorage` key `rc.roster.columns`, demo login, invite flow, swap undo, Why-drawer what-if preview, onboarding redirects.
- **Accessibility.** Keep every `aria-label`, `aria-current`, `aria-pressed`, `aria-expanded`, `sr-only` text and `caption` that exists today. Icon-only buttons need `aria-label`. Hit targets: ≥ 32px on coach desktop controls (`sm` = 32px), ≥ 44px on client/phone and auth (`lg`). Contrast: `muted` `#8B8B91` on `canvas` is ≈ 5.9:1 and `faint` `#5D5D64` ≈ 3.0:1, so `faint` is only for non-essential text (units, placeholders, tertiary meta), never for the only copy of a value.
- **No new dependencies** besides `lucide-react`.
- **Tests.** Existing `*-model.test.ts` files must keep passing unchanged unless a model function's contract intentionally changes (only `queue-model.ts` gains functions; add tests, do not rewrite old ones). Add `toast-model.test.ts`.

## 5. Verification

### 5.1 Per phase

From repo root, all three must pass before committing each phase:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Then `pnpm --filter web build` once at the end of Phase 1 and Phase 4 (catches server/client boundary errors that `tsc` misses, such as passing a component across the boundary).

Visual check (end of each phase): `pnpm --filter web dev` with the API running, sign in as the demo coach and client, and look at: `/`, `/login`, `/coach/clients`, `/coach/progression` (open Why, accept one, press Undo, accept one and wait 5 s, confirm it is gone after refresh), `/coach/clients/<id>?tab=overview|lifts|history|notes`, `/coach/exercises`, `/coach/programs/<id>`, `/coach/settings`, `/client`, `/client/log`, `/client/history`, `/client/lifts/<id>`, at 1440px and 390px widths. Confirm a closed `<dialog>` is not visible anywhere (the `open:flex` pitfall).

### 5.2 Anti-slop greps (must return nothing at the end of Phase 4)

Run from `apps/web/src`:

```bash
rg -n 'rounded-full' . | rg -v 'avatar|dot|spinner|animate-spin|thumb|size-1\.5|size-2 |size-7|bar'   # review each remaining hit by hand
rg -n 'rounded-lg' . | rg -v 'Sheet.tsx'                       # only overlays may use 12px
rg -n '#[0-9A-Fa-f]{6}' components app                          # no hex outside tailwind.config.ts
rg -n '[✕✓▲▼●≈★⚡]' .                                           # no glyph icons
rg -n 'material-symbols|fonts.googleapis.com/icon' .            # no icon CDN
rg -n 'BoltIcon|Eyebrow|padStart\(2' .                          # tropes gone
rg -ni 'black-box|seamless|effortless|supercharge|unlock' .     # copy bans
rg -n 'font-extrabold|shadow-(xl|2xl)|backdrop-blur' .          # weight and glow bans
rg -n 'focus-visible:outline-primary' .                          # global focus ring only
rg -n '\.tabular\b|className="[^"]*\btabular\b' .               # mono migration done
rg -n 'text-\[(10|11|12|13|15)px\]' .                           # use the named scale
```

Telemetry spot check: `rg -n 'formatWeight\(|formatRpe\(|formatDate\(' components app | rg -v font-mono` and review: each rendered call should sit inside a `font-mono` element (strings passed to `aria-label`/`title` are exempt).

### 5.3 Definition of done

- Every item in §0.1 (G1–G13) is visibly addressed.
- Every row in §0.2 is cleared or explicitly allowed above.
- `signal` appears only in: focus ring, `::selection`, `NavLink` active bar and count, `TabBar` active bar, queue selected-row rule, logger current-exercise underline, `Badge tone="signal"`, demo banner label, `StatStrip` emphasis.
- `ACTION_META` is the only place that maps actions to colours/icons (`rg -n "INCREASE_LOAD.*emerald|DELOAD.*(amber|rose)" src` hits only `ActionBadge.tsx`).
