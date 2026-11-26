import { describe, expect, it } from 'vitest';
import { buttonClass } from './Button';

describe('buttonClass', () => {
  it('uses the size padding by default', () => {
    expect(buttonClass('primary', undefined, 'sm').split(' ')).toContain('px-3.5');
  });
  it('lets an icon-only button drop the size padding', () => {
    const cls = buttonClass('ghost', 'w-8 px-0', 'sm').split(' ');
    expect(cls).toContain('px-0');
    expect(cls).not.toContain('px-3.5');
  });
  it('keeps size padding when className only sets unrelated classes', () => {
    expect(buttonClass('secondary', 'w-full mx-2', 'lg').split(' ')).toContain('px-5');
  });
});
