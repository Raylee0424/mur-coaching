import { describe, expect, it } from 'vitest';
import { chunk, formatSleep, parseAppleHealthXml, parseHealthCsv } from './health-import';

const NOW = new Date('2026-03-10T12:00:00Z');

const XML = `<?xml version="1.0"?><HealthData>
<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-03-09 08:00:00 -0800" endDate="2026-03-09 08:10:00 -0800" value="4000"/>
<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-03-09 18:00:00 -0800" endDate="2026-03-09 18:10:00 -0800" value="3000"/>
<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Watch" unit="count" startDate="2026-03-09 08:00:00 -0800" endDate="2026-03-09 08:10:00 -0800" value="6500"/>
<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-03-08 23:30:00 -0800" endDate="2026-03-09 03:30:00 -0800" value="HKCategoryValueSleepAnalysisAsleepCore"/>
<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-03-09 03:30:00 -0800" endDate="2026-03-09 04:00:00 -0800" value="HKCategoryValueSleepAnalysisAwake"/>
<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-03-09 04:00:00 -0800" endDate="2026-03-09 06:48:00 -0800" value="HKCategoryValueSleepAnalysisAsleepREM"/>
<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Watch" unit="ms" startDate="2026-03-09 02:00:00 -0800" endDate="2026-03-09 02:01:00 -0800" value="60"/>
<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Watch" unit="ms" startDate="2026-03-09 04:00:00 -0800" endDate="2026-03-09 04:01:00 -0800" value="75"/>
<Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Watch" unit="count/min" startDate="2026-03-09 00:00:00 -0800" endDate="2026-03-09 23:59:00 -0800" value="52"/>
<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-04-01 08:00:00 -0800" endDate="2026-04-01 08:10:00 -0800" value="99"/>
</HealthData>`;

describe('parseAppleHealthXml', () => {
  it('takes the busiest source per day, asleep stages only, daily means, and drops future days', () => {
    expect(parseAppleHealthXml(XML, NOW)).toEqual([{ date: '2026-03-09', steps: 7000, sleepMinutes: 408, hrvMs: 68, restingHr: 52 }]);
  });
});

describe('parseHealthCsv', () => {
  it('reads aliases and hours, and drops out-of-range values', () => {
    const csv = 'Date;Steps;Sleep Hours;HRV;Resting HR\n2026-03-08;"9,500";7.5;65;400\n2026-03-09;;;;\nnot-a-date;1;1;1;1\n';
    expect(parseHealthCsv(csv, NOW)).toEqual([{ date: '2026-03-08', steps: 9500, sleepMinutes: 450, hrvMs: 65 }]);
  });

  it('needs a date column', () => {
    expect(() => parseHealthCsv('steps\n100', NOW)).toThrow(/date/);
  });
});

describe('helpers', () => {
  it('chunks and formats', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(formatSleep(468)).toBe('7h 48m');
    expect(formatSleep(null)).toBe('—');
  });
});
