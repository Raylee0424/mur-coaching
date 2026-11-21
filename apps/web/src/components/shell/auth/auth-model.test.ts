import { describe, expect, it } from 'vitest';
import { isCompleteCode, normalizeCode, passwordChecks, passwordProblem, passwordScore, setCodeDigits } from './auth-model';

describe('password helpers', () => {
  it('checks length and digit', () => {
    expect(passwordChecks('abc')).toEqual({ length: false, number: false });
    expect(passwordChecks('abcdefg1')).toEqual({ length: true, number: true });
  });
  it('scores 0 to 4', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('a')).toBe(1);
    expect(passwordScore('abcdefgh')).toBe(2);
    expect(passwordScore('Abcdefg1')).toBe(4);
  });
  it('reports problems', () => {
    expect(passwordProblem('short1')).not.toBeNull();
    expect(passwordProblem('longenough')).not.toBeNull();
    expect(passwordProblem('longenough1')).toBeNull();
    expect(passwordProblem('longenough1', 'other')).toBe('Passwords do not match.');
    expect(passwordProblem('longenough1', 'longenough1')).toBeNull();
  });
});

describe('verification code', () => {
  it('normalizes input', () => {
    expect(normalizeCode('482 910 77')).toBe('482910');
    expect(normalizeCode('ab')).toBe('');
  });
  it('sets and spreads digits', () => {
    expect(setCodeDigits('', 0, '4')).toBe('4');
    expect(setCodeDigits('48', 2, '2')).toBe('482');
    expect(setCodeDigits('4829', 1, '7')).toBe('4729');
    expect(setCodeDigits('', 0, '482910')).toBe('482910');
    expect(setCodeDigits('12', 2, '3456789')).toBe('123456');
  });
  it('detects completeness', () => {
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('123456')).toBe(true);
  });
});
