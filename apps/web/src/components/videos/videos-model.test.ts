import { describe, expect, it } from 'vitest';
import type { SetVideoDto } from '@coaching/shared';
import { activeAnnotations, defaultPair, stepTime, videoFileProblem } from './videos-model';

const clip = (id: string, side: SetVideoDto['side'], exerciseName: string) => ({ id, side, exerciseName }) as SetVideoDto;

describe('videos model', () => {
  it('pairs the newest left and right clips of one lift', () => {
    const videos = [clip('a', 'BOTH', 'Squat'), clip('b', 'LEFT', 'Split squat'), clip('c', 'RIGHT', 'Lunge'), clip('d', 'RIGHT', 'Split squat')];
    expect(defaultPair(videos)).toEqual(['b', 'd']);
    expect(defaultPair([clip('a', 'BOTH', 'Squat'), clip('b', 'BOTH', 'Bench')])).toEqual(['a', 'b']);
    expect(defaultPair([])).toEqual([null, null]);
  });

  it('steps by frames inside the clip', () => {
    expect(stepTime(1, 3, 10)).toBeCloseTo(1.1);
    expect(stepTime(0.01, -1, 10)).toBe(0);
    expect(stepTime(9.99, 1, 10)).toBe(10);
  });

  it('shows annotations near the playhead', () => {
    const a = [{ id: '1', timestampMs: 8400, shapes: [], note: null }, { id: '2', timestampMs: 12000, shapes: [], note: null }];
    expect(activeAnnotations(a, 8100).map((x) => x.id)).toEqual(['1']);
    expect(activeAnnotations(a, 10000)).toEqual([]);
  });

  it('checks the file type and size', () => {
    expect(videoFileProblem({ type: 'video/mp4', size: 1000 })).toBeNull();
    expect(videoFileProblem({ type: 'image/gif', size: 1000 })).toMatch(/MP4/);
    expect(videoFileProblem({ type: 'video/webm', size: 300 * 1024 * 1024 })).toMatch(/200 MB/);
  });
});
