import { describe, expect, it } from 'vitest';
import { encodedPhotoProblem, fitWithin, parsePose, sourcePhotoProblem } from './body-model';

describe('body model', () => {
  it('scales the longest edge down and never up', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(800, 1200)).toEqual({ width: 800, height: 1200 });
  });

  it('checks the source and the encoded photo', () => {
    expect(sourcePhotoProblem({ type: 'application/pdf', size: 1 })).not.toBeNull();
    expect(sourcePhotoProblem({ type: 'image/heic', size: 3_000_000 })).toBeNull();
    expect(encodedPhotoProblem(11 * 1024 * 1024)).not.toBeNull();
    expect(encodedPhotoProblem(900_000)).toBeNull();
  });

  it('defaults the pose to front', () => {
    expect(parsePose('BACK')).toBe('BACK');
    expect(parsePose('x')).toBe('FRONT');
  });
});
