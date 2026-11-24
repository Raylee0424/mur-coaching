import { describe, expect, it } from 'vitest';
import { dequeue, enqueue, kgString, newRequestId, parseQueue, type QueuedSet } from './live-model';

const set = (requestId: string): QueuedSet => ({ requestId, clientId: 'k1', exerciseId: 'x1', exerciseName: 'Squat', weightKg: '100', reps: 5 });

describe('live offline queue', () => {
  it('queues each request id once and removes by id', () => {
    let q = enqueue([], set('a'));
    q = enqueue(q, set('a'));
    q = enqueue(q, set('b'));
    expect(q.map((x) => x.requestId)).toEqual(['a', 'b']);
    expect(dequeue(q, 'a').map((x) => x.requestId)).toEqual(['b']);
  });

  it('reads corrupt storage as empty', () => {
    expect(parseQueue('not json')).toEqual([]);
    expect(parseQueue('{"a":1}')).toEqual([]);
    expect(parseQueue(JSON.stringify([set('a'), { nope: true }]))).toHaveLength(1);
  });

  it('makes v4 uuids and API-shaped kg', () => {
    expect(newRequestId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(kgString(102.0583)).toBe('102.06');
    expect(kgString(100)).toBe('100');
  });
});
