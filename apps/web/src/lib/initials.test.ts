import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Marcus Vale')).toBe('MV');
    expect(initials('Mary Ann Lee')).toBe('ML');
    expect(initials('alex')).toBe('A');
  });
  it('skips words that do not start with a letter', () => {
    expect(initials('Alex Carter (Demo)')).toBe('AC');
    expect(initials('Jordan (Demo)')).toBe('J');
    expect(initials('#2 Sam')).toBe('S');
    expect(initials('Élodie Brun')).toBe('ÉB');
  });
  it('falls back when nothing is usable', () => {
    expect(initials('  ')).toBe('?');
    expect(initials('(Demo)')).toBe('?');
    expect(initials('', 'AT')).toBe('AT');
  });
});
