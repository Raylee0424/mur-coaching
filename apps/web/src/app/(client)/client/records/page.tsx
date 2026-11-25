import clsx from "clsx";
import Link from "next/link";
import { Role } from "@coaching/shared";
import { LineChart } from "@/components/charts/LineChart";
import { Sparkline } from "@/components/charts/Sparkline";
import {
  bestSetLabel,
  bracketLabel,
  cellLabel,
  formatE1rm,
  lowestLoggedReps,
  matrixCell,
  formatDeltaPct,
  formatDeltaWeight,
  pickExerciseId,
  sparkValues,
  trackedLiftsLabel,
  trendSeries,
} from "@/components/records/records-model";
import { RecordsEmpty } from "@/components/records/RecordsEmpty";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Term } from "@/components/ui/Term";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import {
  TABLE,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD,
  TR,
} from "@/components/ui/table";
import { exercisesApi, meApi } from "@/lib/api/endpoints";
import { requireUser } from "@/lib/auth";
import { firstParam } from "@/lib/form";
import { formatWeight, unitLabel } from "@/lib/units";
import { shortDate } from "../_components/today-model";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_PICKS = 6;
const DELTA_TONE = {
  good: "text-emerald",
  bad: "text-rose",
  neutral: "text-muted",
} as const;

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser(Role.CLIENT);
  const unit = user.weightUnit;
  const params = await searchParams;
  const records = await meApi.records();
  const selectedId = pickExerciseId(
    records.exercises,
    firstParam(params.exercise),
  );
  const stats = selectedId ? await exercisesApi.stats(selectedId) : null;
  const href = (id: string) =>
    `/client/records?exercise=${encodeURIComponent(id)}`;

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/client/analytics/muscles"
        className={buttonClass("secondary", undefined, "sm")}
      >
        Muscle Map
      </Link>
      <Link
        href="/client/coach-ai"
        className={buttonClass("secondary", undefined, "sm")}
      >
        Ask MUR AI Coach
      </Link>
    </div>
  );

  if (records.exercises.length === 0) {
    return (
      <>
        <PageHeader title="Personal Records" actions={actions} />
        <RecordsEmpty />
      </>
    );
  }

  const series = stats ? trendSeries(stats.trend, unit) : [];
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Personal Records"
        meta={
          <Badge tone="signal">
            {trackedLiftsLabel(records.exercises.length)}
          </Badge>
        }
        actions={actions}
      />

      <div className="space-y-6">
        <p className="text-label-md text-muted">
          <Term id="e1rm" /> is the heaviest single rep your working sets predict. Warm-ups never count.
        </p>

        {/* PR cards (`athlete_web_personal_records_net_progression_pro`, refined) */}
        <section
          aria-label="Best lift per exercise"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {records.exercises.map((e) => {
            const spark = sparkValues(e.trendE1rmKg, unit);
            return (
              <article
                key={e.exerciseId}
                className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 font-display text-title-md text-ink">
                    <Link
                      href={href(e.exerciseId)}
                      className={clsx(
                        "break-words hover:text-primary",
                        e.exerciseId === selectedId && "text-primary",
                      )}
                    >
                      {e.exerciseName}
                    </Link>
                  </h2>
                  {spark.length > 0 ? (
                    <Sparkline
                      values={spark}
                      label={`${e.exerciseName} estimated one-rep max, last ${records.windowDays} days`}
                      width={96}
                      height={28}
                    />
                  ) : (
                    <span className="shrink-0 font-mono text-label-sm text-faint">
                      No sessions in {records.windowDays}d
                    </span>
                  )}
                </div>
                <p className="font-mono text-headline-md tabular-nums text-ink">
                  {bestSetLabel(e.best, unit)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/40 bg-primary-container px-2.5 py-0.5 font-mono text-label-sm tabular-nums text-primary">
                    e1RM {formatE1rm(e.bestE1rmKg, unit)}
                  </span>
                  <span className="font-mono text-label-sm text-muted">
                    <span className="sr-only">Set on </span>
                    {shortDate(e.best.achievedAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        {/* Rep-max matrix */}
        <section className="overflow-hidden rounded-md border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div className="min-w-0">
              <h2 className="font-display text-title-md text-ink">
                Rep-Max Matrix (1RM – 12RM)
              </h2>
              <p className="text-label-md text-muted">
                Logged sets at each rep count. <span className="text-primary">Lime</span> = new in the last {records.windowDays} days. ~ = estimate from your best e1RM. Grey = from a set with more reps.
              </p>
            </div>
            <span className="rounded-full border border-primary/40 bg-primary-container px-3 py-1 font-mono text-label-sm text-primary">
              {records.newRecords} New PR{records.newRecords === 1 ? "" : "s"} (
              {records.windowDays}d)
            </span>
          </div>

          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <caption className="sr-only">
                Heaviest working set per exercise at each rep count. Warm-ups are
                excluded. Counts you have not logged show an estimate from your best e1RM.
              </caption>
              <thead className={THEAD}>
                <tr>
                  <th scope="col" className={TH}>
                    Exercise
                  </th>
                  {records.brackets.map((reps) => (
                    <th key={reps} scope="col" className={TH_NUM}>
                      {bracketLabel(reps)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.exercises.map((e) => {
                  const lowest = lowestLoggedReps(e.cells);
                  return (
                  <tr key={e.exerciseId} className={TR}>
                    <th
                      scope="row"
                      className={clsx(
                        TD,
                        "whitespace-nowrap text-left font-medium",
                      )}
                    >
                      <Link
                        href={href(e.exerciseId)}
                        className={clsx(
                          "hover:text-primary",
                          e.exerciseId === selectedId && "text-primary",
                        )}
                      >
                        {e.exerciseName}
                      </Link>
                    </th>
                    {records.brackets.map((reps, i) => {
                      const cell = e.cells[i] ?? null;
                      const m = matrixCell(cell, reps, lowest, e.bestE1rmKg, unit, records.windowDays, now);
                      const label =
                        m.kind === "estimated"
                          ? `${e.exerciseName}, ${bracketLabel(reps)}: about ${m.text.slice(1)}, estimated`
                          : m.kind === "covered"
                            ? `${e.exerciseName}, ${bracketLabel(reps)}: ${m.text} (set for ${m.setReps} reps)`
                            : `${cellLabel(e.exerciseName, cell, reps, unit)}${m.kind === "logged" && m.isNew ? ", new record" : ""}`;
                      return (
                        <td
                          key={reps}
                          className={clsx(
                            TD_NUM,
                            "tabular-nums",
                            m.kind === "none" && "text-faint",
                            m.kind === "estimated" && "italic text-faint",
                            m.kind === "covered" && "text-muted",
                            m.kind === "logged" && (m.isNew ? "font-semibold text-primary" : "text-ink"),
                          )}
                          title={m.kind === "logged" && cell ? `Set ${shortDate(cell.achievedAt)}` : m.kind === "estimated" ? "Estimate from your best e1RM" : m.kind === "covered" ? `From a set of ${m.setReps} reps` : undefined}
                        >
                          <span aria-label={label}>{m.text}</span>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Net Progression Chart (Left) + Exercise Statistics Table (Right) */}
        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {stats ? (
            <div className="flex min-w-0 flex-col gap-4 rounded-md border border-line bg-card p-5 xl:col-span-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-label-sm uppercase text-primary">
                    SESSION-TO-SESSION NET PROGRESSION
                  </span>
                  <h2 className="mt-0.5 font-display text-title-md text-ink">
                    {stats.exercise.name} e1RM Trend
                  </h2>
                </div>
                <span className="rounded-full border border-primary/40 bg-primary-container px-3 py-1 font-mono text-label-sm text-primary">
                  {formatDeltaWeight(stats.netDeltaKg, unit)} ({stats.sessions}{" "}
                  {stats.sessions === 1 ? "Session" : "Sessions"})
                </span>
              </div>

              {records.exercises.length > 1 ? (
                <Segmented
                  label="Exercise"
                  items={records.exercises.slice(0, MAX_PICKS).map((e) => ({
                    href: href(e.exerciseId),
                    label: e.exerciseName,
                    current: e.exerciseId === selectedId,
                  }))}
                />
              ) : null}

              {series.length >= 2 ? (
                <div className="space-y-3 rounded-sm border border-line bg-canvas-low p-4">
                  <LineChart
                    points={series}
                    unit={unitLabel(unit)}
                    title={`${stats.exercise.name} estimated one-rep max by session`}
                  />
                  <details className="text-meta text-muted">
                    <summary className="cursor-pointer font-mono text-label-sm text-primary">
                      Session e1RM Breakdown
                    </summary>
                    <div className="relative mt-2 overflow-x-auto">
                      <table className={TABLE}>
                        <caption className="sr-only">
                          Estimated one-rep max per session, oldest first
                        </caption>
                        <thead className={THEAD}>
                          <tr>
                            <th scope="col" className={TH}>
                              Date
                            </th>
                            <th scope="col" className={TH_NUM}>
                              Top set
                            </th>
                            <th scope="col" className={TH_NUM}>
                              e1RM
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.trend.map((p) => (
                            <tr key={p.logId} className={TR}>
                              <td className={`${TD} font-mono text-muted`}>
                                {shortDate(p.performedAt)}
                              </td>
                              <td
                                className={TD_NUM}
                              >{`${formatWeight(p.topWeightKg, unit)} × ${p.topSetReps}`}</td>
                              <td className={TD_NUM}>
                                {formatE1rm(p.e1rmKg, unit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-sm border border-line bg-canvas-low p-6">
                  <p className="text-meta text-muted">
                    Log this lift in two sessions to plot your net e1RM
                    progression.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div
            className={clsx(
              "h-full min-w-0 overflow-hidden rounded-md border border-line bg-card",
              stats ? "xl:col-span-6" : "xl:col-span-12",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line p-5">
              <h2 className="font-display text-title-md text-ink">
                Exercise Statistics
              </h2>
              <span className="rounded-full border border-primary/40 bg-primary-container px-2.5 py-0.5 font-mono text-label-sm text-primary">
                PRO TELEMETRY · {records.windowDays}D
              </span>
            </div>
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <caption className="sr-only">
                  Working sets, average RPE and e1RM change per exercise over
                  the last {records.windowDays} days
                </caption>
                <thead className={THEAD}>
                  <tr>
                    <th scope="col" className={TH}>
                      Exercise
                    </th>
                    <th scope="col" className={TH_NUM}>
                      Best e1RM
                    </th>
                    <th scope="col" className={TH_NUM}>
                      Sets ({records.windowDays}D)
                    </th>
                    <th scope="col" className={TH_NUM}>
                      Avg RPE
                    </th>
                    <th scope="col" className={TH_NUM}>
                      Net Delta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.exercises.map((e) => {
                    const d = formatDeltaPct(e.stats.netDeltaPct);
                    return (
                      <tr key={e.exerciseId} className={TR}>
                        <th
                          scope="row"
                          className={`${TD} text-left font-medium`}
                        >
                          <Link
                            href={href(e.exerciseId)}
                            className="hover:text-primary"
                          >
                            {e.exerciseName}
                          </Link>
                        </th>
                        <td className={TD_NUM}>
                          {formatE1rm(e.bestE1rmKg, unit)}
                        </td>
                        <td className={TD_NUM}>{e.stats.sets}</td>
                        <td className={TD_NUM}>
                          {e.stats.avgRpe === null
                            ? "—"
                            : e.stats.avgRpe.toFixed(1)}
                        </td>
                        <td className={clsx(TD_NUM, DELTA_TONE[d.tone])}>
                          {d.text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="font-mono text-label-sm uppercase text-muted">
          e1RM uses the Epley formula on your top working set.
        </p>
      </div>
    </>
  );
}
