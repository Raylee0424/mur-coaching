import { describe, expect, it } from 'vitest';
import { MAX_VISIBLE, pushToast, removeToast, toastDuration } from './toast-model';

describe('toast-model', () => {
  it('defaults duration by tone', () => {
    expect(toastDuration({ message: 'x' })).toBe(5000);
    expect(toastDuration({ message: 'x', tone: 'error' })).toBe(8000);
    expect(toastDuration({ message: 'x', tone: 'error', durationMs: 100 })).toBe(100);
  });

  it('keeps only the newest MAX_VISIBLE toasts', () => {
    let list = pushToast([], 'a', { message: 'a' });
    for (const id of ['b', 'c', 'd']) list = pushToast(list, id, { message: id });
    expect(list).toHaveLength(MAX_VISIBLE);
    expect(list.map((t) => t.id)).toEqual(['b', 'c', 'd']);
  });

  it('removes by id', () => {
    const list = pushToast(pushToast([], 'a', { message: 'a' }), 'b', { message: 'b' });
    expect(removeToast(list, 'a').map((t) => t.id)).toEqual(['b']);
    expect(removeToast(list, 'zz')).toHaveLength(2);
  });
});
