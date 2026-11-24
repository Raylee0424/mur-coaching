import { describe, expect, it } from 'vitest';
import { contentTypeFor, fileProblem, filterResources, formatBytes, parseFilter, shareLabel } from './resources-model';

describe('resources model', () => {
  it('filters by tab and parses unknown tabs as all', () => {
    const items = [{ kind: 'GUIDE' as const }, { kind: 'VIDEO' as const }, { kind: 'OTHER' as const }];
    expect(filterResources(items, 'videos')).toHaveLength(1);
    expect(filterResources(items, 'all')).toHaveLength(3);
    expect(parseFilter('nope')).toBe('all');
    expect(parseFilter('sheets')).toBe('sheets');
  });

  it('formats sizes', () => {
    expect(formatBytes(2_400_000)).toBe('2.4 MB');
    expect(formatBytes(812_000)).toBe('812 KB');
    expect(formatBytes(120)).toBe('120 B');
  });

  it('fills a missing content type from the extension', () => {
    expect(contentTypeFor({ name: 'meet.CSV', type: '' })).toBe('text/csv');
    expect(contentTypeFor({ name: 'a.pdf', type: 'application/pdf' })).toBe('application/pdf');
    expect(contentTypeFor({ name: 'a.exe', type: '' })).toBe('');
  });

  it('rejects empty, huge and unsupported files', () => {
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toContain('empty');
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 300_000_000 })).toContain('at most');
    expect(fileProblem({ name: 'a.exe', type: 'application/x-msdownload', size: 5 })).toContain('not supported');
    expect(fileProblem({ name: 'a.pdf', type: 'application/pdf', size: 5 })).toBeNull();
  });

  it('words the share count', () => {
    expect(shareLabel(0)).toBe('Not shared yet');
    expect(shareLabel(1)).toBe('Shared with 1 client');
    expect(shareLabel(24)).toBe('Shared with 24 clients');
  });
});
