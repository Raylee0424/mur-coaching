import { describe, expect, it } from 'vitest';
import { isModeratorEmail, parseModeratorEmails } from './moderators';

describe('moderators allowlist', () => {
  it('gives nobody for unset, empty or blank lists', () => {
    expect(parseModeratorEmails(undefined).size).toBe(0);
    expect(parseModeratorEmails('').size).toBe(0);
    expect(parseModeratorEmails(' , ,').size).toBe(0);
    expect(isModeratorEmail(undefined, 'a@b.io')).toBe(false);
    expect(isModeratorEmail('', 'a@b.io')).toBe(false);
  });

  it('matches trimmed, case-insensitive entries', () => {
    const raw = ' Mod@Example.com , other@x.io ';
    expect(isModeratorEmail(raw, 'mod@example.com')).toBe(true);
    expect(isModeratorEmail(raw, 'MOD@EXAMPLE.COM ')).toBe(true);
    expect(isModeratorEmail(raw, 'other@x.io')).toBe(true);
  });

  it('rejects unlisted and missing emails', () => {
    expect(isModeratorEmail('mod@example.com', 'nope@example.com')).toBe(false);
    expect(isModeratorEmail('mod@example.com', null)).toBe(false);
  });
});
