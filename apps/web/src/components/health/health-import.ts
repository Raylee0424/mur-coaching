import { HEALTH_LIMITS } from '@coaching/shared';
import type { HealthMetricInput } from '@coaching/shared';

const DAY_MS = 86_400_000;
const SLEEP_ASLEEP = /^HKCategoryValueSleepAnalysisAsleep/;

type Bucket = { steps: Map<string, number>; sleep: Map<string, number>; hrv: number[]; rhr: number[] };

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(n)));
const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

/** "2024-01-15 08:00:00 -0800" → epoch ms; the date part (local to the device) is the day the value belongs to. */
function appleTime(s: string): number {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s.trim());
  return m ? Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4]}`) : Number.NaN;
}

/** Keeps days inside the API's window (not in the future, not older than `maxAgeDays`), oldest first. */
function finish(days: Map<string, HealthMetricInput>, now: Date): HealthMetricInput[] {
  const max = new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
  const min = new Date(now.getTime() - (HEALTH_LIMITS.maxAgeDays - 1) * DAY_MS).toISOString().slice(0, 10);
  return [...days.values()].filter((d) => d.date >= min && d.date <= max).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Apple Health `export.xml` → one entry per day. Steps and sleep are summed per source app and the highest source
 * wins, because iPhone and Watch both record the same walk. HRV (SDNN) and resting HR are daily means. Sleep counts
 * only asleep stages and belongs to the day it ends.
 */
export function parseAppleHealthXml(xml: string, now = new Date()): HealthMetricInput[] {
  const buckets = new Map<string, Bucket>();
  const bucket = (date: string): Bucket => {
    let b = buckets.get(date);
    if (!b) buckets.set(date, (b = { steps: new Map(), sleep: new Map(), hrv: [], rhr: [] }));
    return b;
  };
  const recordRe = /<Record\b([^>]*?)\/?>/g;
  const attrRe = /(\w+)="([^"]*)"/g;
  for (let m = recordRe.exec(xml); m; m = recordRe.exec(xml)) {
    const a: Record<string, string> = {};
    for (let x = attrRe.exec(m[1]!); x; x = attrRe.exec(m[1]!)) a[x[1]!] = x[2]!;
    const source = a.sourceName ?? '?';
    const value = Number(a.value);
    switch (a.type) {
      case 'HKQuantityTypeIdentifierStepCount': {
        if (!a.startDate || !Number.isFinite(value)) break;
        const s = bucket(a.startDate.slice(0, 10)).steps;
        s.set(source, (s.get(source) ?? 0) + value);
        break;
      }
      case 'HKCategoryTypeIdentifierSleepAnalysis': {
        if (!a.endDate || !a.startDate || !SLEEP_ASLEEP.test(a.value ?? '')) break;
        const minutes = (appleTime(a.endDate) - appleTime(a.startDate)) / 60_000;
        if (!Number.isFinite(minutes) || minutes <= 0) break;
        const s = bucket(a.endDate.slice(0, 10)).sleep;
        s.set(source, (s.get(source) ?? 0) + minutes);
        break;
      }
      case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
        if (a.startDate && Number.isFinite(value)) bucket(a.startDate.slice(0, 10)).hrv.push(value);
        break;
      case 'HKQuantityTypeIdentifierRestingHeartRate':
        if (a.startDate && Number.isFinite(value)) bucket(a.startDate.slice(0, 10)).rhr.push(value);
        break;
    }
  }
  const days = new Map<string, HealthMetricInput>();
  for (const [date, b] of buckets) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const entry: HealthMetricInput = { date };
    if (b.steps.size) entry.steps = clamp(Math.max(...b.steps.values()), 0, HEALTH_LIMITS.maxSteps);
    if (b.sleep.size) entry.sleepMinutes = clamp(Math.max(...b.sleep.values()), 0, HEALTH_LIMITS.maxSleepMinutes);
    if (b.hrv.length) entry.hrvMs = clamp(mean(b.hrv), HEALTH_LIMITS.minHrvMs, HEALTH_LIMITS.maxHrvMs);
    if (b.rhr.length) entry.restingHr = clamp(mean(b.rhr), HEALTH_LIMITS.minRestingHr, HEALTH_LIMITS.maxRestingHr);
    days.set(date, entry);
  }
  return finish(days, now);
}

const norm = (h: string): string => h.toLowerCase().replace(/[^a-z]/g, '');

/**
 * Simple daily CSV: `date` plus any of `steps`, `sleep_minutes` (or `sleep_hours`), `hrv_ms`, `resting_hr`. Values
 * outside the allowed ranges are dropped, not clamped, so a typo never turns into a record.
 */
export function parseHealthCsv(csv: string, now = new Date()): HealthMetricInput[] {
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const [head, ...rows] = lines;
  if (!head) return [];
  const delimiter = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ',';
  const split = (l: string): string[] => l.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
  const h = split(head).map(norm);
  const at = (...names: string[]): number => h.findIndex((x) => names.includes(x));
  const c = {
    date: at('date', 'day'),
    steps: at('steps', 'stepcount'),
    sleepMin: at('sleepminutes', 'sleepmin', 'sleep'),
    sleepH: at('sleephours', 'sleeph'),
    hrv: at('hrvms', 'hrv'),
    rhr: at('restinghr', 'restingheartrate', 'rhr'),
  };
  if (c.date === -1) throw new Error('The CSV needs a "date" column.');
  const val = (cells: string[], i: number, min: number, max: number, scale = 1): number | undefined => {
    if (i === -1 || !cells[i]) return undefined;
    const n = Number(cells[i]!.replace(/,/g, '')) * scale;
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : undefined;
  };
  const days = new Map<string, HealthMetricInput>();
  for (const line of rows) {
    const cells = split(line);
    const date = cells[c.date]?.slice(0, 10) ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) continue;
    const entry: HealthMetricInput = { date };
    const steps = val(cells, c.steps, 0, HEALTH_LIMITS.maxSteps);
    const sleep = val(cells, c.sleepMin, 0, HEALTH_LIMITS.maxSleepMinutes) ?? val(cells, c.sleepH, 0, HEALTH_LIMITS.maxSleepMinutes, 60);
    const hrv = val(cells, c.hrv, HEALTH_LIMITS.minHrvMs, HEALTH_LIMITS.maxHrvMs);
    const rhr = val(cells, c.rhr, HEALTH_LIMITS.minRestingHr, HEALTH_LIMITS.maxRestingHr);
    if (steps !== undefined) entry.steps = steps;
    if (sleep !== undefined) entry.sleepMinutes = sleep;
    if (hrv !== undefined) entry.hrvMs = hrv;
    if (rhr !== undefined) entry.restingHr = rhr;
    if (Object.keys(entry).length > 1) days.set(date, entry);
  }
  return finish(days, now);
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const formatSleep = (minutes: number | null): string => (minutes === null ? '—' : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`);
export const formatSteps = (n: number | null): string => (n === null ? '—' : n.toLocaleString('en-US'));
