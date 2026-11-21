import { describe, expect, it } from 'vitest';
import { sparkPoints } from './spark-model';

describe('sparkPoints', () => {
  it('returns nothing for an empty series', () => {
    expect(sparkPoints([], 120, 44, 8)).toEqual([]);
  });
  it('centres a single value', () => {
    expect(sparkPoints([5], 120, 44, 8)).toEqual([{ x: 60, y: 22 }]);
  });
  it('maps the highest value to the top and spreads x evenly', () => {
    expect(sparkPoints([150, 152.5, 155], 120, 44, 8)).toEqual([
      { x: 8, y: 36 },
      { x: 60, y: 22 },
      { x: 112, y: 8 },
    ]);
  });
  it('draws flat series in the middle', () => {
    expect(sparkPoints([100, 100], 120, 44, 8).map((p) => p.y)).toEqual([22, 22]);
  });
});
