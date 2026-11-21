export interface SparkPoint {
  x: number;
  y: number;
}

/** Scales values to an SVG box with padding. Flat or single series sit in the vertical middle. */
export function sparkPoints(values: readonly number[], width: number, height: number, pad: number): SparkPoint[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const round = (n: number) => Math.round(n * 10) / 10;
  return values.map((v, i) => ({
    x: round(values.length === 1 ? width / 2 : pad + (i * innerW) / (values.length - 1)),
    y: round(span === 0 ? height / 2 : pad + ((max - v) / span) * innerH),
  }));
}
